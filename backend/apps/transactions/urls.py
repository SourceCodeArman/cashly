"""
URLs for transactions app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .splits_receipts_views import TransactionSplitViewSet, ReceiptViewSet

router = DefaultRouter()
router.register(r'transactions', views.TransactionViewSet, basename='transaction')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'splits', TransactionSplitViewSet, basename='split')
router.register(r'receipts', ReceiptViewSet, basename='receipt')

app_name = 'transactions'
urlpatterns = [
    path('', include(router.urls)),
]

