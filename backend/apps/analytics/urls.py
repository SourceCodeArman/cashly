from django.urls import path
from .views import DashboardView, SankeyView, TrendsView, NetWorthView, PatternsView, RecommendationsView

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('sankey/', SankeyView.as_view(), name='sankey'),
    path('trends/', TrendsView.as_view(), name='trends'),
    path('net-worth/', NetWorthView.as_view(), name='net-worth'),
    path('patterns/', PatternsView.as_view(), name='patterns'),
    path('recommendations/', RecommendationsView.as_view(), name='recommendations'),
]
