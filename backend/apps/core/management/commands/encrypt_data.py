from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Dummy encryption command (encryption removed)"

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(
                "Encryption has been disabled. Data is already plaintext."
            )
        )
