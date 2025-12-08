"""
API views for insights.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Insight, InsightFeedback
from .serializers import (
    InsightSerializer,
    InsightListSerializer,
    InsightDismissSerializer,
    InsightMarkReadSerializer,
    InsightFeedbackSerializer,
    InsightFeedbackCreateSerializer
)
from .insight_engine import generate_insights


class InsightViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user insights.
    
    Provides list, retrieve, dismiss, and mark_read actions.
    """
    serializer_class = InsightSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return insights for the authenticated user."""
        queryset = Insight.objects.filter(user=self.request.user)
        
        # Filter out dismissed by default unless specified
        include_dismissed = self.request.query_params.get('include_dismissed', 'false')
        if include_dismissed.lower() != 'true':
            queryset = queryset.filter(is_dismissed=False)
        
        # Filter by type if specified
        insight_type = self.request.query_params.get('type')
        if insight_type:
            queryset = queryset.filter(insight_type=insight_type)
        
        # Filter by priority if specified
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Exclude expired insights
        queryset = queryset.filter(
            models.Q(expires_at__isnull=True) | 
            models.Q(expires_at__gt=timezone.now())
        )
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InsightListSerializer
        return InsightSerializer
    
    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Dismiss an insight."""
        insight = self.get_object()
        insight.dismiss()
        return Response({'status': 'dismissed'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark an insight as read."""
        insight = self.get_object()
        insight.mark_as_read()
        return Response({'status': 'marked_as_read'})
    
    @action(detail=False, methods=['post'])
    def dismiss_all(self, request):
        """Dismiss all insights for the user."""
        count = self.get_queryset().update(is_dismissed=True)
        return Response({'status': 'dismissed', 'count': count})
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Manually trigger insight generation for the user."""
        insights = generate_insights(request.user)
        serializer = InsightListSerializer(insights, many=True)
        return Response({
            'status': 'generated',
            'count': len(insights),
            'insights': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get insight summary counts."""
        queryset = Insight.objects.filter(
            user=request.user,
            is_dismissed=False
        )
        
        total = queryset.count()
        unread = queryset.filter(is_read=False).count()
        by_priority = {
            'high': queryset.filter(priority='high').count(),
            'medium': queryset.filter(priority='medium').count(),
            'low': queryset.filter(priority='low').count()
        }
        by_type = {}
        for insight_type in queryset.values_list('insight_type', flat=True).distinct():
            by_type[insight_type] = queryset.filter(insight_type=insight_type).count()
        
        return Response({
            'total': total,
            'unread': unread,
            'by_priority': by_priority,
            'by_type': by_type
        })


class InsightFeedbackView(APIView):
    """View for submitting feedback on insights."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, insight_id):
        """Submit feedback for an insight."""
        try:
            insight = Insight.objects.get(
                insight_id=insight_id,
                user=request.user
            )
        except Insight.DoesNotExist:
            return Response(
                {'error': 'Insight not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = InsightFeedbackCreateSerializer(
            data=request.data,
            context={'request': request, 'insight': insight}
        )
        
        if serializer.is_valid():
            feedback = serializer.save(insight=insight, user=request.user)
            return Response(
                InsightFeedbackSerializer(feedback).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, insight_id):
        """Get feedback for an insight (if exists)."""
        try:
            feedback = InsightFeedback.objects.get(
                insight__insight_id=insight_id,
                user=request.user
            )
            return Response(InsightFeedbackSerializer(feedback).data)
        except InsightFeedback.DoesNotExist:
            return Response(
                {'error': 'No feedback found'},
                status=status.HTTP_404_NOT_FOUND
            )


# Import models at module level to avoid circular imports in get_queryset
from django.db import models
