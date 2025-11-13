"""
URLs for goals app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import action
from . import views

router = DefaultRouter()
router.register(r'', views.GoalViewSet, basename='goal')

app_name = 'goals'
urlpatterns = [
    # Nested contributions routes - MUST come before router.urls
    path('<uuid:goal_pk>/contributions/', views.ContributionListCreateView.as_view(), name='goal-contributions-list'),
    path('<uuid:goal_pk>/contributions/<uuid:pk>/', views.ContributionDetailView.as_view(), name='goal-contributions-detail'),
    # Router URLs come after nested routes
    path('', include(router.urls)),
]

