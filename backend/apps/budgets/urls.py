"""
URLs for budgets app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.BudgetViewSet, basename='budget')

app_name = 'budgets'
urlpatterns = [
    path('', include(router.urls)),
]

