"""
Notification Service — email alerts, interview reminders, application updates.

Supports: Resend, Postmark, SMTP (with graceful fallback to console logging).
"""

import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Notification:
    to_email: str
    subject: str
    body: str
    html_body: str = ""
    from_name: str = "ProfileOptimizer"
    from_email: str = ""
    notification_type: str = "general"


TEMPLATES = {
    "application_submitted": {
        "subject": "Application Submitted: {job_title} at {company_name}",
        "body": (
            "Hi {user_name},\n\n"
            "Your application for {job_title} at {company_name} has been submitted successfully.\n\n"
            "Status: Submitted\nPortal: {portal}\nMatch Score: {match_score}%\n\n"
            "We'll notify you of any status changes.\n\n"
            "Best,\nProfileOptimizer Team"
        ),
        "html": (
            "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;'>"
            "<h2 style='color:#10b981;'>Application Submitted</h2>"
            "<p>Hi {user_name},</p>"
            "<p>Your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been submitted.</p>"
            "<table style='width:100%;border-collapse:collapse;'>"
            "<tr><td style='padding:8px;border-bottom:1px solid #e2e8f0;'>Status</td><td style='padding:8px;border-bottom:1px solid #e2e8f0;'><span style='color:#10b981;font-weight:bold;'>Submitted</span></td></tr>"
            "<tr><td style='padding:8px;border-bottom:1px solid #e2e8f0;'>Portal</td><td style='padding:8px;border-bottom:1px solid #e2e8f0;'>{portal}</td></tr>"
            "<tr><td style='padding:8px;border-bottom:1px solid #e2e8f0;'>Match Score</td><td style='padding:8px;border-bottom:1px solid #e2e8f0;'>{match_score}%</td></tr>"
            "</table>"
            "<p style='margin-top:20px;'>Best,<br/>ProfileOptimizer Team</p>"
            "</div>"
        ),
    },
    "application_failed": {
        "subject": "Application Failed: {job_title} at {company_name}",
        "body": (
            "Hi {user_name},\n\n"
            "Unfortunately, your application for {job_title} at {company_name} encountered an error.\n\n"
            "Error: {error_message}\nAttempts: {retry_count}/{max_retries}\n\n"
            "The system will automatically retry if retries remain.\n\n"
            "Best,\nProfileOptimizer Team"
        ),
    },
    "interview_reminder": {
        "subject": "Interview Reminder: {job_title} at {company_name}",
        "body": (
            "Hi {user_name},\n\n"
            "Reminder: You have an upcoming interview for {job_title} at {company_name}.\n\n"
            "Prepare well and good luck!\n\n"
            "Best,\nProfileOptimizer Team"
        ),
    },
    "daily_digest": {
        "subject": "Your Daily Job Application Digest",
        "body": (
            "Hi {user_name},\n\n"
            "Here's your daily summary:\n\n"
            "Applications Submitted: {submitted_count}\n"
            "Interviews Scheduled: {interview_count}\n"
            "Total Active: {active_count}\n\n"
            "Keep up the great work!\n\n"
            "Best,\nProfileOptimizer Team"
        ),
    },
}


class NotificationService:
    def __init__(self):
        self._send_function = self._detect_provider()

    def _detect_provider(self):
        from app.config import settings
        if settings.RESEND_API_KEY:
            return self._send_resend
        if settings.POSTMARK_API_TOKEN:
            return self._send_postmark
        if settings.SMTP_HOST:
            return self._send_smtp
        return self._send_console

    def send(self, notification: Notification) -> dict:
        if not notification.from_email:
            from app.config import settings
            notification.from_email = settings.SMTP_FROM_EMAIL
        try:
            result = self._send_function(notification)
            logger.info("Notification sent: type=%s to=%s subject=%s",
                        notification.notification_type, notification.to_email, notification.subject)
            return {"success": True, "provider": self._send_function.__name__, **result}
        except Exception as e:
            logger.error("Failed to send notification: %s", e)
            return {"success": False, "error": str(e)}

    def send_application_submitted(self, to_email: str, user_name: str,
                                    job_title: str, company_name: str,
                                    portal: str, match_score: float = 0) -> dict:
        tpl = TEMPLATES["application_submitted"]
        return self.send(Notification(
            to_email=to_email,
            subject=tpl["subject"].format(job_title=job_title, company_name=company_name),
            body=tpl["body"].format(
                user_name=user_name, job_title=job_title,
                company_name=company_name, portal=portal,
                match_score=round(match_score),
            ),
            html_body=tpl.get("html", "").format(
                user_name=user_name, job_title=job_title,
                company_name=company_name, portal=portal,
                match_score=round(match_score),
            ),
            notification_type="application_submitted",
        ))

    def send_application_failed(self, to_email: str, user_name: str,
                                 job_title: str, company_name: str,
                                 error_message: str, retry_count: int,
                                 max_retries: int) -> dict:
        tpl = TEMPLATES["application_failed"]
        return self.send(Notification(
            to_email=to_email,
            subject=tpl["subject"].format(job_title=job_title, company_name=company_name),
            body=tpl["body"].format(
                user_name=user_name, job_title=job_title,
                company_name=company_name, error_message=error_message,
                retry_count=retry_count, max_retries=max_retries,
            ),
            notification_type="application_failed",
        ))

    def send_interview_reminder(self, to_email: str, user_name: str,
                                 job_title: str, company_name: str) -> dict:
        tpl = TEMPLATES["interview_reminder"]
        return self.send(Notification(
            to_email=to_email,
            subject=tpl["subject"].format(job_title=job_title, company_name=company_name),
            body=tpl["body"].format(user_name=user_name, job_title=job_title,
                                    company_name=company_name),
            notification_type="interview_reminder",
        ))

    def send_daily_digest(self, to_email: str, user_name: str,
                           stats: dict) -> dict:
        tpl = TEMPLATES["daily_digest"]
        return self.send(Notification(
            to_email=to_email,
            subject=tpl["subject"],
            body=tpl["body"].format(
                user_name=user_name,
                submitted_count=stats.get("submitted", 0),
                interview_count=stats.get("interviews", 0),
                active_count=stats.get("active", 0),
            ),
            notification_type="daily_digest",
        ))

    def _send_resend(self, notification: Notification) -> dict:
        import resend
        from app.config import settings
        resend.api_key = settings.RESEND_API_KEY
        params = {
            "from": f"{notification.from_name} <{notification.from_email}>",
            "to": [notification.to_email],
            "subject": notification.subject,
            "text": notification.body,
        }
        if notification.html_body:
            params["html"] = notification.html_body
        result = resend.Emails.send(params)
        return {"message_id": result.get("id", "")}

    def _send_postmark(self, notification: Notification) -> dict:
        import httpx
        from app.config import settings
        resp = httpx.post(
            "https://api.postmarkapp.com/email",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": settings.POSTMARK_API_TOKEN,
            },
            json={
                "From": f"{notification.from_name} <{notification.from_email}>",
                "To": notification.to_email,
                "Subject": notification.subject,
                "TextBody": notification.body,
                "HtmlBody": notification.html_body or "",
            },
        )
        resp.raise_for_status()
        return {"message_id": resp.json().get("MessageID", "")}

    def _send_smtp(self, notification: Notification) -> dict:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from app.config import settings

        msg = MIMEMultipart("alternative")
        msg["From"] = f"{notification.from_name} <{notification.from_email}>"
        msg["To"] = notification.to_email
        msg["Subject"] = notification.subject

        msg.attach(MIMEText(notification.body, "plain"))
        if notification.html_body:
            msg.attach(MIMEText(notification.html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return {"message_id": "smtp-sent"}

    def _send_console(self, notification: Notification) -> dict:
        logger.info("CONSOLE NOTIFICATION: to=%s subject=%s\n%s",
                     notification.to_email, notification.subject, notification.body[:200])
        return {"message_id": "console-logged"}


_notification_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
