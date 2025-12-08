from django.apps import AppConfig


class GoalsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.goals'
    
    def ready(self):
        """Import signals when app is ready."""
        import apps.goals.signals  # noqa