from django.urls import path
from .views import (
    DashboardView,
    SankeyView,
    TrendsView,
    NetWorthView,
    PatternsView,
    RecommendationsView,
    MonthlySpendingView,
    WeeklySpendingView,
)

urlpatterns = [
    path(
        "", DashboardView.as_view(), name="dashboard"
    ),  # Root dashboard at /api/v1/dashboard/
    path(
        "dashboard/", DashboardView.as_view(), name="dashboard-alt"
    ),  # Alt path at /api/v1/analytics/dashboard/
    path("sankey/", SankeyView.as_view(), name="sankey"),
    path("trends/", TrendsView.as_view(), name="trends"),
    path("net-worth/", NetWorthView.as_view(), name="net-worth"),
    path("patterns/", PatternsView.as_view(), name="patterns"),
    path("recommendations/", RecommendationsView.as_view(), name="recommendations"),
    path("monthly-spending/", MonthlySpendingView.as_view(), name="monthly-spending"),
    path("weekly-spending/", WeeklySpendingView.as_view(), name="weekly-spending"),
]
