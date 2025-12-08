# Database Configuration Guide

## Overview

The Django settings now support **two methods** for database configuration, with **individual environment variables taking priority**:

1. **Individual Parameters** (Recommended) ✅
2. **Connection String** (Fallback)

## Method 1: Individual Environment Variables (Recommended)

This method provides the most flexibility and is recommended for Supabase connections.

### Environment Variables

Set these in your `.env` file or Docker environment:

```bash
# Required
DB_USER=postgres.your-project-ref
DB_PASSWORD=your-database-password
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres

# Optional (auto-detected based on host)
DB_SSLMODE=require  # Options: disable, allow, prefer, require, verify-ca, verify-full
```

### For Supabase

Get your connection details from: **Supabase Dashboard → Project Settings → Database**

#### Transaction Mode (Recommended for Django)
```bash
DB_USER=postgres.your-project-ref
DB_PASSWORD=your-password-here
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
```

#### Session Mode (Alternative)
```bash
DB_USER=postgres.your-project-ref
DB_PASSWORD=your-password-here
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
```

#### Direct Connection (Not Recommended for Production)
```bash
DB_USER=postgres
DB_PASSWORD=your-password-here
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
```

### For Local Development

```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cashly_dev
```

### For Docker Compose

```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432
DB_NAME=cashly
```

## Method 2: Connection String (Fallback)

If individual parameters are not provided, the system falls back to connection string format.

### Environment Variables

```bash
DATABASE_URL=postgresql://user:password@host:port/dbname
# OR
DB_URL=postgresql://user:password@host:port/dbname
```

### For Supabase

```bash
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Configuration Priority

The system checks for configuration in this order:

1. **Individual Parameters** (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME`)
   - If all four are present, uses them
   - Auto-detects SSL mode based on host
   - Adds connection pooling (`CONN_MAX_AGE=600`)

2. **Connection String** (`DATABASE_URL` or `DB_URL`)
   - If individual params not found, tries connection string
   - Parses and configures SSL automatically
   - Adds connection pooling

3. **Default Local** (Fallback)
   - If nothing is configured, uses local PostgreSQL
   - `localhost:5432` with user `postgres`

## SSL Configuration

SSL mode is **automatically configured** based on the host:

- **Local hosts** (`localhost`, `127.0.0.1`, `db`): `sslmode=prefer`
- **Remote hosts** (Supabase, etc.): `sslmode=require`
- **Override**: Set `DB_SSLMODE` environment variable

## Docker Compose Configuration

Update your `docker-compose.yml` environment section:

```yaml
services:
  web:
    environment:
      # Database - Individual Parameters (Recommended)
      DB_USER: postgres.your-project-ref
      DB_PASSWORD: ${DB_PASSWORD}
      DB_HOST: aws-0-us-east-1.pooler.supabase.com
      DB_PORT: 6543
      DB_NAME: postgres
      
      # OR use connection string
      # DATABASE_URL: ${DATABASE_URL}
```

## Troubleshooting

### Issue: "Tenant or user not found"

**Cause**: Incorrect username format for Supabase pooler

**Solution**: Use the full username with project reference:
```bash
DB_USER=postgres.your-project-ref  # ✅ Correct
# NOT just: postgres  # ❌ Wrong for pooler
```

### Issue: "Connection refused"

**Cause**: Wrong host or port

**Solution**: 
- For pooler (transaction mode): Use port `6543`
- For direct connection: Use port `5432`
- Verify host from Supabase dashboard

### Issue: "SSL required"

**Cause**: Supabase requires SSL connections

**Solution**: 
- SSL is auto-configured for remote hosts
- If issues persist, explicitly set: `DB_SSLMODE=require`

### Issue: "Connection timeout"

**Cause**: Project might be paused or network issues

**Solution**:
1. Check if Supabase project is paused
2. Restore project if needed (takes 2-5 minutes)
3. Verify network connectivity
4. Try using session mode (port 5432) instead

## Testing Your Configuration

### 1. Test Database Connection

```bash
# In Docker
docker-compose exec web python manage.py dbshell

# Locally
python manage.py dbshell
```

### 2. Run Migrations

```bash
# In Docker
docker-compose exec web python manage.py migrate

# Locally
python manage.py migrate
```

### 3. Check Connection

```bash
# In Docker
docker-compose exec web python manage.py shell

# Locally
python manage.py shell
```

Then in the shell:
```python
from django.db import connection
connection.ensure_connection()
print("✅ Database connected successfully!")
print(f"Database: {connection.settings_dict['NAME']}")
print(f"User: {connection.settings_dict['USER']}")
print(f"Host: {connection.settings_dict['HOST']}")
print(f"Port: {connection.settings_dict['PORT']}")
```

## Example Configurations

### Development (Local PostgreSQL)

```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cashly_dev
```

### Docker Development

```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432
DB_NAME=cashly
```

### Production (Supabase Transaction Mode)

```bash
DB_USER=postgres.abcdefghijklmnop
DB_PASSWORD=your-secure-password-here
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_SSLMODE=require
```

### Production (Supabase Session Mode)

```bash
DB_USER=postgres.abcdefghijklmnop
DB_PASSWORD=your-secure-password-here
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_SSLMODE=require
```

## Migration from DATABASE_URL

If you're currently using `DATABASE_URL`, you can migrate to individual parameters:

### Before
```bash
DATABASE_URL=postgresql://postgres.abc123:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### After
```bash
DB_USER=postgres.abc123
DB_PASSWORD=password
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
```

**Note**: Both methods work, but individual parameters are more flexible and easier to manage.

## Security Best Practices

1. **Never commit** `.env` files to version control
2. **Use strong passwords** for database access
3. **Rotate credentials** regularly
4. **Use connection pooling** (enabled by default)
5. **Enable SSL** for production (auto-configured)
6. **Restrict IP access** in Supabase dashboard if possible
7. **Use environment-specific** credentials (dev, staging, prod)

## Additional Resources

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [Django Database Configuration](https://docs.djangoproject.com/en/stable/ref/settings/#databases)
- [PostgreSQL SSL Documentation](https://www.postgresql.org/docs/current/libpq-ssl.html)

