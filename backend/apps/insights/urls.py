"""
URL configuration for insights app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InsightViewSet, InsightFeedbackView

router = DefaultRouter()
router.register(r'', InsightViewSet, basename='insight')

urlpatterns = [
    path('', include(router.urls)),
    path('<uuid:insight_id>/feedback/', InsightFeedbackView.as_view(), name='insight-feedback'),
]
