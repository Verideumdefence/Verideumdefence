# VerideumDefence Backend

FastAPI backend for the VerideumDefence cybersecurity app: JWT auth, scan management with a
pluggable analysis engine, findings triage, and reporting aggregates.

## Quick start

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Interactive docs: http://localhost:8000/docs

Seed an admin user (`admin@gmail.com` / `admin123456789`) plus a demo scan against the local machine:

```bash
python -m scripts.seed
```

With Docker (API + Postgres):

```bash
docker compose up --build
```

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness probe |
| POST | `/api/v1/auth/login` | Exchange credentials for a JWT |
| GET | `/api/v1/auth/me` | Current user |
| PATCH | `/api/v1/users/me` | Update name / password |
| GET | `/api/v1/users` | List users (admin) |
| DELETE | `/api/v1/users/{id}` | Delete a user (admin) |
| POST | `/api/v1/scans` | Queue a scan (runs in a background task) |
| GET | `/api/v1/scans` | List own scans, optional `?status=` filter |
| GET | `/api/v1/scans/{id}` | Scan with its findings |
| DELETE | `/api/v1/scans/{id}` | Delete a scan |
| GET | `/api/v1/scans/{id}/findings` | Findings, optional `?severity=` filter |
| PATCH | `/api/v1/scans/{id}/findings/{fid}` | Mark a finding resolved |
| GET | `/api/v1/reports/summary` | Counts by severity, open findings, risk score |
| POST | `/api/v1/inquiries` | Submit a public website inquiry |
| GET | `/api/v1/inquiries` | List website inquiries (admin) |

The public inquiry form is rate-limited. Other `/api/v1` routes except `auth/login` and `inquiries` require
`Authorization: Bearer <token>`. Scans are scoped to their owner; admins can read any scan.

## Configuration

Settings are read from the environment with the `VERIDEUMDEFENCE_` prefix (see `.env.example`):
`SECRET_KEY`, `DATABASE_URL`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`.
Legacy `CIPHERA_` environment variables are still accepted so existing deployments keep working.
SQLite is the default; set a Postgres URL for anything beyond local development.

## Plugging in a real scanner

`app/services/scanner.py` owns the scan lifecycle and delegates target analysis to
`analyze_target(target, scan_type)`, which currently applies baseline heuristics
(cleartext protocols, risky exposed ports, loopback targets). Replace that function with
a call into nmap/ZAP/your sniffer — it just returns a list of finding dicts, so the API,
persistence and reporting layers stay unchanged.

## Development

```bash
pytest          # tests
ruff check .    # lint
mypy app        # types
```
