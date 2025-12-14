# Cashly Backend

The backend for Cashly is built with Django and Django REST Framework. It provides a robust API for the frontend and mobile apps, handling authentication, transactions, banking integrations (Plaid), subscriptions (Stripe), and background tasks (Celery).

## Tech Stack

-   **Framework**: Django 5.0
-   **API**: Django REST Framework (DRF)
-   **Database**: PostgreSQL (via Supabase in production)
-   **Task Queue**: Celery with Redis
-   **Authentication**: JWT (SimpleJWT)
-   **Documentation**: Swagger/OpenAPI (drf-yasg)

## Prerequisites

-   Python 3.12+
-   Redis (for Celery)
-   PostgreSQL / Supabase account

## specific Setup

### 1. Environment Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your credentials (see `README.md` in root for valid variable descriptions).

### 3. Database & Migrations

If using Supabase or local Postgres:

```bash
python manage.py migrate
python manage.py seed_categories # Optional: Pre-fill categories
python manage.py createsuperuser
```

### 4. Running the Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/v1/`.

### 5. Background Tasks (Celery)

Ensure Redis is running, then start the worker:

```bash
celery -A config worker -l info
```

## Testing

Run the full test suite with Pytest:

```bash
pytest
```

## Linting

(Add any linting commands here if applicable, e.g., `black`, `flake8`)

## Project Structure

-   `apps/`: Django apps (accounts, transactions, etc.)
-   `config/`: Project settings and URL configuration
-   `docs/`: Additional documentation
-   `staticfiles/`: Collected static files

## Docker

See [README.docker.md](README.docker.md) for Docker instructions.
