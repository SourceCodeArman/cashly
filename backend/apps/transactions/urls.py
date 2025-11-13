"""
URLs for transactions app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'transactions', views.TransactionViewSet, basename='transaction')
router.register(r'categories', views.CategoryViewSet, basename='category')

app_name = 'transactions'
urlpatterns = [
    path('', include(router.urls)),
]

