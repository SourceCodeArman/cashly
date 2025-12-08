"""
Management command to manually trigger API analytics aggregation.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.api.tasks import aggregate_hourly_analytics


class Command(BaseCommand):
    help = 'Manually aggregate API analytics data into hourly summaries'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=1,
            help='Number of hours to aggregate (default: 1, processes the last hour)',
        )
        parser.add_argument(
            '--backfill',
            action='store_true',
            help='Backfill historical data for the specified number of hours',
        )

    def handle(self, *args, **options):
        hours = options['hours']
        backfill = options['backfill']
        
        self.stdout.write(self.style.SUCCESS(f'Starting analytics aggregation...'))
        
        if backfill:
            self.stdout.write(f'Backfilling {hours} hours of historical data')
            
            # Process each hour separately
            for i in range(hours):
                try:
                    result = aggregate_hourly_analytics()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Processed hour {i+1}/{hours}: {result.get("logs_processed", 0)} logs'
                        )
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'✗ Failed to process hour {i+1}/{hours}: {e}')
                    )
        else:
            # Process just the last hour
            try:
                result = aggregate_hourly_analytics()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Aggregated {result.get("logs_processed", 0)} logs into '
                        f'{result.get("records_created", 0)} new and '
                        f'{result.get("records_updated", 0)} updated records'
                    )
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Aggregation failed: {e}'))
        
        self.stdout.write(self.style.SUCCESS('Analytics aggregation complete!'))

