"""
URLs for notifications app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, UnreadCountView, NotificationPreferenceView

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notification')

app_name = 'notifications'

urlpatterns = [
    path('unread_count/', UnreadCountView.as_view(), name='unread-count'),
    path('preferences/', NotificationPreferenceView.as_view(), name='preferences'),
    path('', include(router.urls)),
]

