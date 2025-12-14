import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.analytics.utils import get_spending_trends
from django.contrib.auth import get_user_model

User = get_user_model()
# Get a user, or create one if none exists
user = User.objects.first()
if not user:
    print("No user found. Creating one...")
    user = User.objects.create_user(username='testuser', password='password')

print(f"Testing for user: {user.username}")

try:
    trends = get_spending_trends(user)
    print("Trends output:")
    for item in trends:
        print(item)
except Exception as e:
    print(f"Error: {e}")
