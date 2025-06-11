# healthcare_microservices/user_service/user_app/management/commands/wait_for_db.py

import time
from django.db import connections
from django.db.utils import OperationalError
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    """Django command to wait for database."""

    def handle(self, *args, **options):
        """Handle the command."""
        self.stdout.write('Waiting for database...')
        db_conn = connections['default'] # Get the default database connection

        retries = 60 # Try up to 60 times
        delay = 1 # Wait 1 second between tries

        for i in range(retries):
            try:
                db_conn.ensure_connection() # Try to connect
                self.stdout.write(self.style.SUCCESS('Database available!'))
                return # Success

            except OperationalError:
                self.stdout.write(f'Database unavailable, waiting ({i+1}/{retries})...')
                time.sleep(delay)
            except Exception as e:
                self.stdout.write(f'An unexpected error occurred: {e}')
                self.stdout.write(f'Database unavailable, waiting ({i+1}/{retries})...')
                time.sleep(delay)

        self.stdout.write(self.style.ERROR('Failed to connect to database after multiple retries.'))
        exit(1) # Exit with error status