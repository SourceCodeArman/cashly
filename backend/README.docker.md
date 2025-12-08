# Docker Setup for Cashly Backend

This directory contains the Docker configuration for the Cashly backend.

## Prerequisites

- Docker
- Docker Compose

## Configuration

**Important:** This setup assumes you are using a remote database (like Supabase) or a local database running outside of Docker.

1.  **Environment Variables**:
    Ensure you have a `.env` file in the `backend` directory with your database credentials.
    
    Example `.env` for Supabase:
    ```
    DATABASE_URL=postgres://user:password@host:port/dbname
    # OR
    DB_HOST=aws-0-us-west-1.pooler.supabase.com
    DB_NAME=postgres
    DB_USER=postgres.yourproject
    DB_PASSWORD=yourpassword
    DB_PORT=6543
    ```

## Getting Started

1.  **Build and Start the Containers**

    ```bash
    docker-compose up --build
    ```

    This command will:
    - Build the Django backend image.
    - Start Redis (for Celery/Cache).
    - Start Django (web) and Celery containers.
    - Run database migrations automatically (via `entrypoint.sh`).
    - Collect static files.
    - Start the development server at `http://localhost:8000`.

2.  **Accessing the Application**

    - API: `http://localhost:8000/api/v1/`
    - Admin: `http://localhost:8000/admin/`

3.  **Stopping the Containers**

    ```bash
    docker-compose down
    ```

## Troubleshooting

- **Database Connection Issues**: 
    - Ensure your `.env` file has the correct `DATABASE_URL` or `DB_*` variables.
    - If using Supabase, ensure you are using the Transaction Pooler (port 6543) if you are in a serverless environment, though for Docker containers the Session Pooler (port 5432) is also fine.
    - Check if your IP is allowed in Supabase database settings.

- **Permission Issues**: If you encounter permission issues with `entrypoint.sh`, ensure it is executable:
    ```bash
    chmod +x entrypoint.sh
    ```
