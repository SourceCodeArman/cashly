"""
Log reading and parsing utilities for admin dashboard.
"""
import os
import re
from datetime import datetime
from typing import List, Dict, Optional
from django.conf import settings
from pathlib import Path


LOG_LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
LOG_TYPES = ['django', 'error', 'security', 'api']


def parse_log_line(line: str) -> Optional[Dict]:
    """
    Parse a single log line in Django logging format.
    Expected format: YYYY-MM-DD HH:MM:SS,mmm LEVEL logger_name: message
    """
    # Django logging format: 2024-01-01 12:00:00,123 INFO logger: message
    pattern = r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),(\d{3})\s+(\w+)\s+(\w+)\s*:\s*(.+)$'
    match = re.match(pattern, line.strip())
    
    if not match:
        # Try alternative format without microseconds
        pattern = r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\w+)\s+(\w+)\s*:\s*(.+)$'
        match = re.match(pattern, line.strip())
        if match:
            timestamp_str, level, logger, message = match.groups()
            timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
        else:
            return None
    else:
        timestamp_str, microseconds, level, logger, message = match.groups()
        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
    
    # Determine log type based on logger name
    log_type = 'django'
    if 'security' in logger.lower() or 'auth' in logger.lower():
        log_type = 'security'
    elif 'error' in logger.lower() or 'exception' in logger.lower():
        log_type = 'error'
    elif 'api' in logger.lower() or 'request' in logger.lower():
        log_type = 'api'
    
    return {
        'timestamp': timestamp.isoformat(),
        'level': level.upper(),
        'logger': logger,
        'message': message,
        'type': log_type,
        'raw': line.strip(),
    }


def read_logs(
    log_file_path: Optional[str] = None,
    log_type: Optional[str] = None,
    level: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    search: Optional[str] = None
) -> Dict:
    """
    Read and parse log file with filtering and pagination.
    
    Args:
        log_file_path: Path to log file (defaults to django.log)
        log_type: Filter by log type (django|error|security|api)
        level: Filter by log level (DEBUG|INFO|WARNING|ERROR|CRITICAL)
        limit: Maximum number of entries to return
        offset: Number of entries to skip
        search: Search term to filter messages
    
    Returns:
        Dict with 'entries' (list) and 'total' (int)
    """
    if log_file_path is None:
        # Default to django.log in logs directory
        base_dir = Path(settings.BASE_DIR)
        log_file_path = base_dir / 'logs' / 'django.log'
    
    log_file_path = Path(log_file_path)
    
    if not log_file_path.exists():
        return {'entries': [], 'total': 0}
    
    entries = []
    
    try:
        # Read file in reverse (most recent first)
        with open(log_file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        # Parse all lines
        parsed_entries = []
        for line in lines:
            parsed = parse_log_line(line)
            if parsed:
                parsed_entries.append(parsed)
        
        # Filter entries
        filtered_entries = parsed_entries
        
        if log_type:
            filtered_entries = [e for e in filtered_entries if e['type'] == log_type]
        
        if level:
            filtered_entries = [e for e in filtered_entries if e['level'] == level.upper()]
        
        if search:
            search_lower = search.lower()
            filtered_entries = [
                e for e in filtered_entries
                if search_lower in e['message'].lower() or search_lower in e['logger'].lower()
            ]
        
        # Reverse to get most recent first, then paginate
        filtered_entries.reverse()
        total = len(filtered_entries)
        
        # Apply pagination
        paginated_entries = filtered_entries[offset:offset + limit]
        
        return {
            'entries': paginated_entries,
            'total': total,
        }
    
    except Exception as e:
        # Return empty result on error
        return {'entries': [], 'total': 0, 'error': str(e)}


def sanitize_log_entry(entry: Dict) -> Dict:
    """
    Sanitize log entry to remove sensitive information.
    """
    message = entry.get('message', '')
    
    # Remove potential passwords/tokens
    sensitive_patterns = [
        r'password["\']?\s*[:=]\s*["\']?[^"\']+',
        r'token["\']?\s*[:=]\s*["\']?[^"\']+',
        r'api[_-]?key["\']?\s*[:=]\s*["\']?[^"\']+',
        r'secret["\']?\s*[:=]\s*["\']?[^"\']+',
    ]
    
    for pattern in sensitive_patterns:
        message = re.sub(pattern, r'\1: [REDACTED]', message, flags=re.IGNORECASE)
    
    entry['message'] = message
    return entry

