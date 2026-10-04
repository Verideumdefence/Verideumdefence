"""Scheduled scan management using APScheduler."""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.models import Scan, ScanStatus
from app.services.scanner import run_scan


scheduler = BackgroundScheduler()


def start_scheduler():
    """Start the background scheduler."""
    if not scheduler.running:
        scheduler.start()


def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()


def add_scheduled_scan(scan_id: int, cron_expression: str, db: Session):
    """Add a scheduled scan to the scheduler.
    
    Args:
        scan_id: The ID of the scan to schedule
        cron_expression: Cron expression (e.g., "0 0 * * *" for daily at midnight)
        db: Database session
    """
    # Remove existing job if any
    job_id = f"scan_{scan_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    
    # Add new job
    scheduler.add_job(
        func=run_scheduled_scan,
        trigger=CronTrigger.from_crontab(cron_expression),
        id=job_id,
        args=[scan_id],
        replace_existing=True
    )
    
    # Update scan record
    scan = db.get(Scan, scan_id)
    if scan:
        scan.is_scheduled = True
        scan.schedule_cron = cron_expression
        db.commit()


def remove_scheduled_scan(scan_id: int, db: Session):
    """Remove a scheduled scan from the scheduler.
    
    Args:
        scan_id: The ID of the scan to unschedule
        db: Database session
    """
    job_id = f"scan_{scan_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    
    # Update scan record
    scan = db.get(Scan, scan_id)
    if scan:
        scan.is_scheduled = False
        scan.schedule_cron = None
        db.commit()


def run_scheduled_scan(scan_id: int):
    """Execute a scheduled scan.
    
    This function is called by the scheduler when a scheduled scan is due.
    """
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    try:
        scan = db.get(Scan, scan_id)
        if scan and scan.is_scheduled:
            # Create a new scan instance for this execution
            new_scan = Scan(
                target=scan.target,
                scan_type=scan.scan_type,
                owner_id=scan.owner_id,
                status=ScanStatus.pending
            )
            db.add(new_scan)
            db.commit()
            db.refresh(new_scan)
            
            # Run the scan
            run_scan(db, new_scan.id)
    except Exception as e:
        print(f"Error running scheduled scan {scan_id}: {e}")
    finally:
        db.close()


def get_scheduled_jobs():
    """Get all scheduled jobs."""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
        })
    return jobs
