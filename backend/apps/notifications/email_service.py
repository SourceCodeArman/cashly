import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

class EmailService:
    """
    Service for sending emails.
    """
    
    @staticmethod
    def send_email(to_email, subject, template_name, context=None):
        """
        Send an email using a template.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            template_name: Path to the email template (without extension)
            context: Context dictionary for the template
        """
        if not context:
            context = {}
            
        try:
            # In a real app, we would have HTML templates
            # For now, we'll just use the message as the content if no template exists
            # or we can implement a simple text fallback
            
            # html_content = render_to_string(f"{template_name}.html", context)
            # text_content = strip_tags(html_content)
            
            # For this implementation, we'll assume simple text emails or 
            # we can construct a simple HTML wrapper here
            
            message = context.get('message', '')
            html_content = f"""
            <html>
                <body>
                    <h2>{subject}</h2>
                    <p>{message}</p>
                    <hr>
                    <p>Cashly - Your Personal Finance Assistant</p>
                </body>
            </html>
            """
            text_content = strip_tags(html_content)
            
            send_mail(
                subject=subject,
                message=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=False,
            )
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    @staticmethod
    def send_notification_email(user, subject, message, recipient_email=None):
        """
        Send a generic notification email to a user or specified email.
        
        Args:
            user: User instance (can be None if recipient_email is provided)
            subject: Email subject
            message: Email message
            recipient_email: Optional email to override user.email
        """
        to_email = recipient_email if recipient_email else (user.email if user else None)
        if not to_email:
            raise ValueError("Either user or recipient_email must be provided")
            
        return EmailService.send_email(
            to_email=to_email,
            subject=subject,
            template_name="notifications/generic",
            context={'message': message, 'user': user}
        )

    @staticmethod
    def send_budget_alert_email(user, budget_name, spent, limit):
        """
        Send a budget alert email.
        """
        subject = f"Budget Alert: {budget_name}"
        message = f"You have exceeded your budget for {budget_name}. You have spent ${spent:.2f} out of ${limit:.2f}."
        
        return EmailService.send_email(
            to_email=user.email,
            subject=subject,
            template_name="notifications/budget_alert",
            context={
                'message': message,
                'budget_name': budget_name,
                'spent': spent,
                'limit': limit,
                'user': user
            }
        )

    @staticmethod
    def send_goal_milestone_email(user, goal_name, milestone):
        """
        Send a goal milestone email.
        """
        subject = f"Goal Milestone Reached: {goal_name}"
        message = f"Congratulations! You have reached {milestone}% of your goal '{goal_name}'."
        
        return EmailService.send_email(
            to_email=user.email,
            subject=subject,
            template_name="notifications/goal_milestone",
            context={
                'message': message,
                'goal_name': goal_name,
                'milestone': milestone,
                'user': user
            }
        )
