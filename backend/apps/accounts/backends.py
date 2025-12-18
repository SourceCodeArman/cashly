from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


class PhoneOrEmailBackend(ModelBackend):
    """
    Authentication backend that allows users to log in with either
    email or phone number.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        # 'username' param here will contain the email or phone number or 'login' field
        if username is None:
            username = (
                kwargs.get("login") or kwargs.get("email") or kwargs.get("phone_number")
            )

        if username is None:
            return None

        try:
            # Check by email or phone number
            user = User.objects.get(Q(email=username) | Q(phone_number=username))
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
