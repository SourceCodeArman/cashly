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
    path('payment-method/', views.PaymentMethodView.as_view(), name='payment-method'),
    path('payment-method/update/', views.UpdatePaymentMethodView.as_view(), name='payment-method-update'),
    path('stripe-config/', views.StripeConfigView.as_view(), name='stripe-config'),
    path('create/', views.CreateSubscriptionView.as_view(), name='create'),
    path('webhooks/', views.WebhookView.as_view(), name='webhooks'),
    path('', include(router.urls)),
]


