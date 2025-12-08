from django.urls import path
from .views import WaitlistUserCreateView

urlpatterns = [
    path('waitlist/', WaitlistUserCreateView.as_view(), name='waitlist-create'),
]
