# Supabase Database Setup Guide

## Getting Your Database Connection String

The information you're seeing (Project URL, API Key) is for Supabase's REST API, which is used by frontend applications. For Django, you need the **PostgreSQL database connection string**.

### Steps to Find Your Database Connection String:

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/yeohuydyvpfhhaukltqz

2. **Click on "Project Settings"** (gear icon in the left sidebar)

3. **Click on "Database"** in the settings menu

4. **Scroll down to "Connection string"** section

5. **Select "URI" tab** (not "Connection pooling")

6. **Copy the connection string** - it will look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.yeohuydyvpfhhaukltqz.supabase.co:5432/postgres
   ```

7. **Replace `[YOUR-PASSWORD]`** with your actual database password
   - If you don't know your password, you can reset it in the same Database settings page
   - Look for "Database password" section to reset or view it

### Alternative: Connection Pooling (Recommended for Production)

For better performance and connection management, you can use the **Connection pooling** string instead:

1. In the "Connection string" section, select the **"Connection pooling"** tab
2. Copy the connection string - it will look like:
   ```
   postgresql://postgres.yeohuydyvpfhhaukltqz:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

## Setting Up Your .env File

Once you have your connection string, add it to your `backend/.env` file:

```env
# Database Connection (Supabase)
DATABASE_URL=postgresql://postgres:your_actual_password@db.yeohuydyvpfhhaukltqz.supabase.co:5432/postgres

# Or if using connection pooling:
# DATABASE_URL=postgresql://postgres.yeohuydyvpfhhaukltqz:your_actual_password@aws-0-[region].pooler.supabase.com:6543/postgres

# Other required settings
SECRET_KEY=your-django-secret-key-here
DEBUG=True
```

## Important Notes

- **Database Password**: This is different from your Supabase account password. It's the password you set when creating the project, or you can reset it in Project Settings → Database.
- **SSL**: Supabase requires SSL connections. The `dj-database-url` package automatically handles this when using the connection string.
- **API Key vs Database Connection**: 
  - **API Key** (what you showed): Used by frontend JavaScript clients to access Supabase's REST API
  - **Database Connection String**: Used by Django to connect directly to PostgreSQL
- **Your Project**: Your project reference is `yeohuydyvpfhhaukltqz` (from your URL)

## Testing the Connection

After adding the `DATABASE_URL` to your `.env` file, test the connection:

```bash
cd backend
source venv/bin/activate
python manage.py migrate
```

If the connection works, you'll see the migrations run successfully. If there's an error, check:
1. The password is correct
2. The connection string format is correct
3. Your IP is allowed (Supabase may require you to allow your IP address in the dashboard)

## Allowing Your IP Address

If you get connection errors, you may need to allow your IP address:

1. Go to Project Settings → Database
2. Scroll to "Connection pooling" or "Network restrictions"
3. Add your current IP address to the allowed list
4. For development, you can temporarily allow all IPs (0.0.0.0/0) - **NOT recommended for production**

## Security Notes

- **Never commit your `.env` file** to version control
- The database password is sensitive - keep it secure
- For production, use connection pooling and restrict IP access
- Consider using environment-specific connection strings (development vs production)

