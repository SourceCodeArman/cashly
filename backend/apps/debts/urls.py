"""
URL configuration for debts app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DebtAccountViewSet, DebtPaymentViewSet, DebtStrategyViewSet, DebtSummaryView

app_name = 'debts'

router = DefaultRouter()
router.register(r'debts', DebtAccountViewSet, basename='debt')
router.register(r'debt-payments', DebtPaymentViewSet, basename='debt-payment')
router.register(r'debt-strategies', DebtStrategyViewSet, basename='debt-strategy')

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', DebtSummaryView.as_view(), name='debt-summary'),
]
