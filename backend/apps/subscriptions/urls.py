"""
URLs for subscriptions app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'', views.SubscriptionViewSet, basename='subscription')

app_name = 'subscriptions'
urlpatterns = [
    path('config/', views.SubscriptionConfigView.as_view(), name='config'),
    path('stripe-config/', views.StripeConfigView.as_view(), name='stripe-config'),
    path('checkout-session/', views.CreateCheckoutSessionView.as_view(), name='checkout-session'),
    path('portal-session/', views.CreatePortalSessionView.as_view(), name='portal-session'),
    path('webhooks/', views.WebhookView.as_view(), name='webhooks'),
    path('', include(router.urls)),
]


