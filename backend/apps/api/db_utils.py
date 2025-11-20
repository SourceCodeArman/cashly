"""
Database utility functions for admin dashboard.
"""
from django.db import connection
from django.db.models import Count
from django.apps import apps


def get_table_sizes():
    """
    Get table sizes and row counts for all models.
    Returns a list of dicts with table info.
    """
    tables = []
    
    # First, try to get all tables directly from PostgreSQL
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                schemaname,
                tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        """)
        db_tables = cursor.fetchall()
        
        # Create a mapping of table names to their info
        db_table_info = {}
        for schema, table_name in db_tables:
            try:
                # Get table size
                cursor.execute("""
                    SELECT pg_size_pretty(pg_total_relation_size(%s::regclass))
                """, [f"{schema}.{table_name}"])
                size_result = cursor.fetchone()
                size = size_result[0] if size_result else '0 bytes'
                
                        # Get actual row count using COUNT query
                # Table names from pg_tables are safe to use
                try:
                    # Use proper quoting with Django's connection
                    quoted_table = connection.ops.quote_name(table_name)
                    quoted_schema = connection.ops.quote_name(schema)
                    cursor.execute(f'SELECT COUNT(*) FROM {quoted_schema}.{quoted_table}')
                    count_result = cursor.fetchone()
                    actual_rows = int(count_result[0]) if count_result else 0
                except Exception as e:
                    # If direct count fails, try to get estimate from pg_class
                    try:
                        cursor.execute("""
                            SELECT reltuples::bigint 
                            FROM pg_class 
                            WHERE relname = %s AND relnamespace = (
                                SELECT oid FROM pg_namespace WHERE nspname = %s
                            )
                        """, [table_name, schema])
                        rows_result = cursor.fetchone()
                        actual_rows = int(rows_result[0]) if rows_result and rows_result[0] is not None else 0
                    except Exception:
                        actual_rows = 0
                
                db_table_info[table_name] = {
                    'size': size,
                    'estimated_rows': actual_rows,  # Actually using actual count now
                }
            except Exception as e:
                # If we can't get stats for a table, still include it with defaults
                import logging
                logger = logging.getLogger(__name__)
                logger.debug(f"Error getting stats for table {table_name}: {str(e)}")
                db_table_info[table_name] = {
                    'size': '0 bytes',
                    'estimated_rows': 0,
                }
    
    # Get all models and match them with database tables
    all_models = apps.get_models()
    model_table_map = {}
    
    for model in all_models:
        if model._meta.db_table:
            table_name = model._meta.db_table
            model_table_map[table_name] = {
                'model_name': model.__name__,
                'app_label': model._meta.app_label,
            }
    
    # Combine database info with model info
    for table_name, db_info in db_table_info.items():
        model_info = model_table_map.get(table_name, {})
        
        # Use the row count we already got from the database query
        # (We're already using actual COUNT queries, so no need to query models again)
        row_count = db_info['estimated_rows']  # This is actually the actual count now
        
        tables.append({
            'name': table_name,
            'model_name': model_info.get('model_name', table_name),
            'app_label': model_info.get('app_label', 'unknown'),
            'row_count': row_count,
            'size': db_info['size'],
        })
    
    return sorted(tables, key=lambda x: x['row_count'], reverse=True)


def get_database_stats():
    """
    Get overall database statistics.
    """
    with connection.cursor() as cursor:
        # Database version
        cursor.execute("SELECT version()")
        db_version = cursor.fetchone()[0]
        
        # Database size
        cursor.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
        db_size = cursor.fetchone()[0]
        
        # Connection count
        cursor.execute("""
            SELECT count(*) FROM pg_stat_activity 
            WHERE datname = current_database()
        """)
        connection_count = cursor.fetchone()[0]
        
        # Total tables
        cursor.execute("""
            SELECT count(*) FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        table_count = cursor.fetchone()[0]
    
    return {
        'version': db_version,
        'size': db_size,
        'connection_count': connection_count,
        'table_count': table_count,
    }


def get_connection_pool_stats():
    """
    Get database connection pool statistics.
    Note: This is basic info, actual pool stats depend on connection backend.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                count(*) as total_connections,
                count(*) FILTER (WHERE state = 'active') as active_connections,
                count(*) FILTER (WHERE state = 'idle') as idle_connections
            FROM pg_stat_activity 
            WHERE datname = current_database()
        """)
        result = cursor.fetchone()
        
        return {
            'total_connections': result[0],
            'active_connections': result[1],
            'idle_connections': result[2],
        }

