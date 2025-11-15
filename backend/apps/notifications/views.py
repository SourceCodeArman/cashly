"""
Views for notifications app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone

from .models import Notification
from .serializers import NotificationSerializer, NotificationCreateSerializer
from .permissions import IsNotificationOwner


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications.
    """
    permission_classes = [IsAuthenticated, IsNotificationOwner]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        """Return notifications for the current user."""
        queryset = Notification.objects.filter(user=self.request.user)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read', None)
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
        
        # Filter by type
        notification_type = self.request.query_params.get('type', None)
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        
        # Order by: unread first (is_read=False), then by created_at descending
        return queryset.order_by('is_read', '-created_at')
    
    def list(self, request, *args, **kwargs):
        """List user's notifications with pagination."""
        response = super().list(request, *args, **kwargs)
        
        # Wrap paginated response in custom format
        if hasattr(response, 'data') and isinstance(response.data, dict):
            paginated_data = response.data
            return Response({
                'status': 'success',
                'data': {
                    'count': paginated_data.get('count', 0),
                    'next': paginated_data.get('next'),
                    'previous': paginated_data.get('previous'),
                    'results': paginated_data.get('results', [])
                },
                'message': 'Notifications retrieved successfully'
            }, status=status.HTTP_200_OK)
        
        return response
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single notification."""
        response = super().retrieve(request, *args, **kwargs)
        
        # Wrap response in custom format
        if hasattr(response, 'data'):
            return Response({
                'status': 'success',
                'data': response.data,
                'message': 'Notification retrieved successfully'
            }, status=status.HTTP_200_OK)
        
        return response
    
    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Notification marked as read'
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all user's notifications as read."""
        updated_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'status': 'success',
            'data': {'updated_count': updated_count},
            'message': f'Marked {updated_count} notification(s) as read'
        })
    
    def destroy(self, request, *args, **kwargs):
        """Delete a notification."""
        notification = self.get_object()
        notification.delete()
        return Response({
            'status': 'success',
            'data': None,
            'message': 'Notification deleted successfully'
        }, status=status.HTTP_200_OK)


class UnreadCountView(APIView):
    """
    View to get unread notification count for the current user.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Return unread notification count."""
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        
        return Response({
            'status': 'success',
            'data': {'count': count},
            'message': 'Unread count retrieved successfully'
        })

