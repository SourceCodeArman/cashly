# Cashly

A personal finance management application built with Django and React, featuring automated transaction tracking, intelligent categorization, and goal-oriented savings.

## Features

- **Bank Account Integration**: Connect bank accounts via Plaid for automatic transaction import
- **Transaction Management**: View, filter, search, and categorize transactions
- **Smart Categorization**: Automatic and manual transaction categorization
- **Savings Goals**: Create and track savings goals with progress visualization
- **Dashboard**: Comprehensive financial overview with spending analytics
- **Secure Authentication**: JWT-based authentication with password reset

## Tech Stack

- **Backend**: Django 5.0, Django REST Framework
- **Database**: PostgreSQL
- **Task Queue**: Celery with Redis
- **API Integration**: Plaid for bank account connectivity
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Documentation**: Swagger/OpenAPI (drf-yasg)

## Setup

### Prerequisites

- Python 3.11+
- Supabase account (for database) or PostgreSQL (local development)
- Redis (for Celery task queue)
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cashly
```

2. Navigate to backend directory:
```bash
cd backend
```

3. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Set up environment variables:
Create a `.env` file in the `backend/` directory with your configuration (see Environment Variables section below).

6. Set up Supabase database:
   - Create a new project at [Supabase](https://supabase.com)
   - Go to Project Settings → Database
   - Copy the connection string (URI) from the "Connection string" section
   - Add it to your `.env` file as `DATABASE_URL`
   
   Or use individual database parameters:
   ```env
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your_supabase_password
   DB_HOST=db.your-project-ref.supabase.co
   DB_PORT=5432
   DB_SSLMODE=require
   ```

7. Run database migrations:
```bash
python manage.py migrate
python manage.py seed_categories
python manage.py createsuperuser
```

8. Run development server:
```bash
python manage.py runserver
```

### Docker Setup

```bash
cd backend
docker-compose up -d
```

## API Documentation

Once the server is running, access the API documentation at:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

## Environment Variables

### Backend Environment Variables

The Django backend requires a `.env` file in the `backend/` directory. Copy the example file and configure it:

```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
```

Key environment variables for `backend/.env`:

**Database (Supabase):**
- `DATABASE_URL`: Supabase connection string (recommended)
  - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
  - Get this from: Supabase Dashboard → Project Settings → Database → Connection string
- OR use individual parameters:
  - `DB_NAME`: Database name (usually `postgres`)
  - `DB_USER`: Database user (usually `postgres`)
  - `DB_PASSWORD`: Your Supabase database password
  - `DB_HOST`: Your Supabase host (e.g., `db.xxxxx.supabase.co`)
  - `DB_PORT`: Database port (usually `5432`)
  - `DB_SSLMODE`: SSL mode (use `require` for Supabase)

**Django:**
- `SECRET_KEY`: Django secret key (generate a new one for production)
- `DEBUG`: Set to `True` for development, `False` for production

**Plaid Integration:**
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`: Plaid API credentials (get from https://dashboard.plaid.com/)
- `PLAID_ENCRYPTION_KEY`: Key for encrypting Plaid access tokens (generate with Fernet)
- `PLAID_PRODUCTS`: Comma-separated list of Plaid products to enable (default: transactions,auth,identity,investments,assets,liabilities)
- `PLAID_WEBHOOK_URL`: Public HTTPS endpoint for Plaid webhooks (use ngrok in development)
- `PLAID_COUNTRY_CODES`: Comma-separated list of ISO country codes (default: US)
- `PLAID_LANGUAGE`: Plaid Link default language (default: en)
- `PLAID_WEBHOOK_SECRET`: Shared secret for verifying Plaid webhook signatures (production)
- `PLAID_WEBHOOK_VERIFICATION_KEY_ID`: Verification key identifier from Plaid dashboard
- `PLAID_WEBHOOK_ALLOWED_IPS`: Comma-separated list of IP addresses allowed to post Plaid webhooks
- `PLAID_WEBHOOK_IDEMPOTENCY_TTL`: Seconds to cache webhook fingerprints to prevent duplicate processing

**Celery/Redis:**
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`: Redis connection URLs for Celery

**CORS:**
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins
- `FRONTEND_URL`: Base URL of your frontend application

**Note:** The `.env` file in the project root (if present) is for Taskmaster AI tooling and is separate from the Django backend configuration. The backend only reads from `backend/.env`.

## Project Structure

```
cashly/
├── backend/
│   ├── apps/
│   │   ├── accounts/          # User authentication and account management
│   │   ├── transactions/      # Transaction and category management
│   │   ├── goals/             # Savings goals
│   │   ├── budgets/           # Budget management (Phase 2)
│   │   ├── analytics/         # Dashboard and analytics
│   │   └── api/               # API utilities (exceptions, permissions, middleware)
│   ├── config/                # Django project configuration
│   │   ├── settings/          # Environment-specific settings
│   │   └── urls.py            # URL routing
│   ├── manage.py              # Django management script
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Docker configuration
│   └── docker-compose.yml     # Docker Compose configuration
└── README.md                  # Project documentation
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `PATCH /api/v1/auth/profile` - Update user profile

### Accounts
- `POST /api/v1/accounts/create-link-token` - Create Plaid link token
- `POST /api/v1/accounts/connect` - Connect bank account
- `GET /api/v1/accounts/` - List user accounts
- `POST /api/v1/accounts/:id/sync` - Sync account transactions

### Transactions
- `GET /api/v1/transactions/transactions/` - List transactions
- `GET /api/v1/transactions/transactions/:id` - Get transaction details
- `POST /api/v1/transactions/transactions/:id/categorize` - Categorize transaction
- `GET /api/v1/transactions/transactions/stats` - Get transaction statistics

### Categories
- `GET /api/v1/transactions/categories/` - List categories
- `POST /api/v1/transactions/categories/` - Create custom category

### Goals
- `GET /api/v1/goals/` - List savings goals
- `POST /api/v1/goals/` - Create goal
- `POST /api/v1/goals/:id/contribute` - Record contribution

## Mobile Integration Notes

- Mobile clients can call the same REST endpoints listed above. All responses follow the `{ status, data, message }` envelope.
- Use the official Plaid Link SDK for iOS/Android. Request a Link token via `POST /api/v1/accounts/create-link-token/` and feed the returned token into the SDK.
- When Plaid Link succeeds, send the `public_token`, institution metadata, and selected account IDs to `POST /api/v1/accounts/connect/` to finalize the connection.
- Monitor account metadata for `ITEM_LOGIN_REQUIRED` errors and prompt users to reconnect through Plaid Link when necessary.
- Webhooks hit `/api/v1/accounts/webhook/`. Mobile clients should react to webhook-driven updates (e.g., refresh account balances when notified).
- `GET /api/v1/goals/:id/forecast` - Get goal forecast

### Dashboard
- `GET /api/v1/dashboard/` - Get dashboard data

## Development

### Running Tests

```bash
cd backend
pytest
```

### Running Celery Worker

```bash
cd backend
celery -A config worker -l info
```

### Database Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

## License

See LICENSE file for details.
