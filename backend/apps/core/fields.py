from django.db import models


class EncryptedCharField(models.CharField):
    """
    A CharField that acts as a pass-through (formerly encrypted).
    Encryption has been disabled and removed.
    """

    def get_prep_value(self, value):
        return value

    def from_db_value(self, value, expression, connection):
        return value


class EncryptedTextField(models.TextField):
    """
    A TextField that acts as a pass-through (formerly encrypted).
    Encryption has been disabled and removed.
    """

    def get_prep_value(self, value):
        return value

    def from_db_value(self, value, expression, connection):
        return value
