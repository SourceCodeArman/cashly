"""
API utility views.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone


class HealthCheckView(APIView):
    """
    Health check endpoint for monitoring and load balancers.
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request):
        return Response({
            'status': 'success',
            'data': {
                'service': 'Cashly API',
                'status': 'healthy',
                'timestamp': timezone.now().isoformat(),
            },
            'message': 'Service is operational'
        }, status=status.HTTP_200_OK)
