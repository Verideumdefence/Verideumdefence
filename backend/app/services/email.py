import logging
from email.message import EmailMessage
from smtplib import SMTP, SMTPException

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_inquiry_notification(inquiry: object) -> None:
    settings = get_settings()
    contact_email = settings.contact_email
    smtp_host = settings.smtp_host.strip()
    smtp_username = settings.smtp_username.strip()
    smtp_password = settings.smtp_password.strip()
    smtp_from_email = settings.smtp_from_email.strip() or smtp_username or contact_email

    if not smtp_host:
        logger.info("Inquiry email not sent: SMTP host is not configured. Target inbox: %s", contact_email)
        return

    message = EmailMessage()
    message["Subject"] = f"New inquiry: {getattr(inquiry, 'subject', 'Website inquiry')}"
    message["From"] = smtp_from_email
    message["To"] = contact_email
    message.set_content(
        "\n\n".join(
            [
                f"Name: {getattr(inquiry, 'requester_name', '')}",
                f"Email: {getattr(inquiry, 'requester_email', '')}",
                f"Company: {getattr(inquiry, 'company', '') or 'Not provided'}",
                f"Service: {getattr(inquiry, 'service', '')}",
                "",
                "Message:",
                getattr(inquiry, 'description', ''),
            ]
        )
    )

    try:
        with SMTP(smtp_host, settings.smtp_port) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)
            server.send_message(message)
    except (SMTPException, OSError) as exc:
        logger.warning("Failed to send inquiry email to %s: %s", contact_email, exc)
