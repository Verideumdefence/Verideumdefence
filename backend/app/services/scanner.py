"""Scan execution.

The analysis itself is intentionally pluggable: `run_scan` persists the lifecycle of a
scan and delegates the target analysis to a heuristic engine that can be swapped for a
real scanner (nmap, ZAP, custom sniffer) without touching the API layer.
"""

import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import nmap
import requests
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Finding, Scan, ScanStatus, Severity

_WEAK_SCHEMES = {"http", "ftp", "telnet"}
_RISKY_PORTS = {21: "FTP", 23: "Telnet", 3389: "RDP", 5900: "VNC", 3306: "MySQL"}


def _wait_for_zap_scan(base_url: str, scan_type: str, scan_id: str, api_key: str) -> None:
    """Wait for ZAP spider or active scan status to reach 100 percent."""
    deadline = time.monotonic() + 900
    while time.monotonic() < deadline:
        response = requests.get(
            f"{base_url}/JSON/{scan_type}/view/status/",
            params={"apikey": api_key, "scanId": scan_id},
            timeout=30,
        )
        response.raise_for_status()
        if int(response.json().get("status", 0)) >= 100:
            return
        time.sleep(2)
    raise TimeoutError(f"ZAP {scan_type} did not finish within 15 minutes")


def run_nmap_scan(target: str) -> list[dict[str, object]]:
    """Run nmap scan against target and return findings."""
    findings: list[dict[str, object]] = []
    
    try:
        nm = nmap.PortScanner()
        
        # Parse hostname from target
        parsed = urlparse(target if "//" in target else f"//{target}")
        host = parsed.hostname or target
        
        # Run basic port scan
        nm.scan(host, arguments="-sV -sC --top-ports 100")
        
        for host in nm.all_hosts():
            for proto in nm[host].all_protocols():
                ports = nm[host][proto].keys()
                
                for port in ports:
                    port_info = nm[host][proto][port]
                    state = port_info['state']
                    
                    if state == 'open':
                        service = port_info.get('name', 'unknown')
                        product = port_info.get('product', '')
                        version = port_info.get('version', '')
                        
                        severity = Severity.medium
                        title = f"Open port {port}/{proto} ({service})"
                        
                        # Critical ports
                        if port in {23, 3389, 5900}:
                            severity = Severity.critical
                            title = f"Critical: Open {service} on port {port}"
                        elif port in {21, 22, 3306, 5432, 6379, 27017}:
                            severity = Severity.high
                        
                        findings.append({
                            "title": title,
                            "description": f"Port {port}/{proto} is open running {service}. {product} {version}".strip(),
                            "severity": severity,
                            "recommendation": f"Restrict {service} access to trusted networks and implement strong authentication."
                        })
                        
                        # Check for outdated services
                        if version and any(old in version.lower() for old in ['old', 'legacy', 'deprecated']):
                            findings.append({
                                "title": f"Potentially outdated {service} version",
                                "description": f"Service {service} version {version} may be outdated and vulnerable.",
                                "severity": Severity.high,
                                "recommendation": "Update to the latest stable version."
                            })
        
        # Check for vulnerabilities using nmap scripts
        nm.scan(host, arguments="--script=vuln")
        for host in nm.all_hosts():
            if 'script' in nm[host]:
                for script_id, script_output in nm[host]['script'].items():
                    if 'VULNERABLE' in script_output:
                        findings.append({
                            "title": f"Vulnerability detected: {script_id}",
                            "description": script_output,
                            "severity": Severity.critical,
                            "recommendation": "Patch the identified vulnerability immediately."
                        })
                        
    except Exception as e:
        findings.append({
            "title": "Nmap scan failed",
            "description": f"Unable to complete nmap scan: {str(e)}",
            "severity": Severity.info,
            "recommendation": "Ensure target is reachable and nmap has proper permissions."
        })
    
    return findings


def run_zap_scan(target: str) -> list[dict[str, object]]:
    """Run OWASP ZAP scan against target and return findings."""
    findings: list[dict[str, object]] = []
    
    try:
        # Parse target URL
        parsed = urlparse(target if "//" in target else f"http://{target}")
        url = parsed.geturl()
        
        # ZAP API endpoint
        settings = get_settings()
        base_url = settings.zap_api_url.rstrip("/")
        if not settings.zap_api_key:
            raise RuntimeError("ZAP_API_KEY is not configured")
        
        # Start spider scan
        spider_response = requests.get(
            f"{base_url}/JSON/spider/action/scan/",
            params={
                "apikey": settings.zap_api_key,
                "url": url,
                "recurse": "true"
            },
            timeout=30
        )
        spider_response.raise_for_status()

        if spider_response.status_code == 200:
            scan_data = spider_response.json()
            scan_id = scan_data.get("scan")
            if scan_id is None:
                raise RuntimeError("ZAP did not return a spider scan ID")
            _wait_for_zap_scan(base_url, "spider", str(scan_id), settings.zap_api_key)
            
            # Start active scan
            ascan_response = requests.get(
                f"{base_url}/JSON/ascan/action/scan/",
                params={
                    "apikey": settings.zap_api_key,
                    "url": url,
                    "recurse": "true"
                },
                timeout=30
            )
            ascan_response.raise_for_status()

            if ascan_response.status_code == 200:
                active_scan_id = ascan_response.json().get("scan")
                if active_scan_id is None:
                    raise RuntimeError("ZAP did not return an active scan ID")
                _wait_for_zap_scan(base_url, "ascan", str(active_scan_id), settings.zap_api_key)
                
                # Get alerts
                alerts_response = requests.get(
                    f"{base_url}/JSON/core/view/alerts/",
                    params={
                        "apikey": settings.zap_api_key,
                        "baseurl": url
                    },
                    timeout=30
                )
                
                if alerts_response.status_code == 200:
                    alerts_data = alerts_response.json()
                    alerts = alerts_data.get("alerts", [])
                    
                    for alert in alerts:
                        risk = alert.get("risk", "0")
                        alert_name = alert.get("name", "Unknown")
                        description = alert.get("description", "")
                        solution = alert.get("solution", "Review and fix the issue.")
                        
                        # Map ZAP risk to Severity
                        severity_map = {
                            "0": Severity.info,
                            "1": Severity.low,
                            "2": Severity.medium,
                            "3": Severity.high
                        }
                        severity = severity_map.get(risk, Severity.medium)
                        
                        findings.append({
                            "title": f"ZAP Alert: {alert_name}",
                            "description": description,
                            "severity": severity,
                            "recommendation": solution
                        })
        
        if not findings:
            findings.append({
                "title": "ZAP scan completed",
                "description": "OWASP ZAP scan completed but no vulnerabilities were detected.",
                "severity": Severity.info,
                "recommendation": "Continue monitoring and schedule regular scans."
            })
            
    except Exception as e:
        findings.append({
            "title": "ZAP scan failed",
            "description": f"Unable to complete ZAP scan: {str(e)}",
            "severity": Severity.info,
            "recommendation": "Ensure ZAP service is running and target URL is accessible."
        })
    
    return findings


def analyze_target(target: str, scan_type: str) -> list[dict[str, object]]:
    parsed = urlparse(target if "//" in target else f"//{target}")
    findings: list[dict[str, object]] = []

    # Use nmap for port/network scans
    if scan_type in ["port", "network", "full"]:
        findings.extend(run_nmap_scan(target))

    # Use OWASP ZAP for web vulnerability scans
    if scan_type in ["web", "full"]:
        findings.extend(run_zap_scan(target))

    scheme = urlparse(target).scheme
    if scheme in _WEAK_SCHEMES:
        findings.append(
            {
                "title": f"Unencrypted protocol in use ({scheme})",
                "description": (
                    f"The target is reachable over {scheme}, which transmits credentials "
                    "and payloads in cleartext."
                ),
                "severity": Severity.high,
                "recommendation": "Terminate traffic over TLS and redirect plaintext requests.",
            }
        )

    port = parsed.port
    if port in _RISKY_PORTS:
        findings.append(
            {
                "title": f"Exposed {_RISKY_PORTS[port]} service on port {port}",
                "description": (
                    f"Port {port} is commonly targeted for brute-force and lateral movement."
                ),
                "severity": Severity.critical if port in (23, 3389) else Severity.medium,
                "recommendation": "Restrict the port to a VPN or bastion host and enforce MFA.",
            }
        )

    host = parsed.hostname or ""
    if host in {"0.0.0.0", "localhost", "127.0.0.1"}:
        findings.append(
            {
                "title": "Scan target is a loopback or wildcard address",
                "description": "Results reflect the local host rather than an external asset.",
                "severity": Severity.info,
                "recommendation": "Point the scan at the publicly resolvable hostname.",
            }
        )

    if scan_type == "web" and scheme != "https":
        findings.append(
            {
                "title": "HSTS cannot be enforced",
                "description": "A web target without HTTPS cannot use HSTS or secure cookies.",
                "severity": Severity.medium,
                "recommendation": "Issue a certificate and set Strict-Transport-Security.",
            }
        )

    if not findings:
        findings.append(
            {
                "title": "No issues detected by baseline checks",
                "description": f"Baseline {scan_type} checks completed without matches.",
                "severity": Severity.info,
                "recommendation": "Schedule recurring scans to catch configuration drift.",
            }
        )
    return findings


def run_scan(db: Session, scan_id: int) -> None:
    scan = db.get(Scan, scan_id)
    if scan is None:
        return
    scan.status = ScanStatus.running
    db.commit()
    try:
        for item in analyze_target(scan.target, scan.scan_type):
            db.add(Finding(scan_id=scan.id, **item))
        scan.status = ScanStatus.completed
    except Exception as exc:  # pragma: no cover - defensive
        scan.status = ScanStatus.failed
        scan.error = str(exc)
    scan.finished_at = datetime.now(timezone.utc)
    db.commit()
