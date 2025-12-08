#!/bin/sh

if [ "$DB_HOST" = "db" ] || [ "$DB_HOST" = "localhost" ]; then
    echo "Waiting for postgres..."

    while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
      sleep 1
    done

    echo "PostgreSQL started"
fi

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

exec "$@"
