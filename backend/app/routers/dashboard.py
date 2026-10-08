"""Dashboard statistics and activity router."""

from fastapi import APIRouter
from app.database import get_all_users
from app.models import DashboardStatsResponse, DashboardStatItem, ActivityItem

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats():
    """Returns overview metrics and recent system events."""
    users = get_all_users()
    total_users = len(users)

    return DashboardStatsResponse(
        overview=[
            DashboardStatItem(
                label="Registered Users",
                value=str(total_users),
                change="+12% this week",
                trend="up",
            ),
            DashboardStatItem(
                label="Active Sessions",
                value="24",
                change="+5 active now",
                trend="up",
            ),
            DashboardStatItem(
                label="System Health",
                value="99.9%",
                change="Normal operation",
                trend="neutral",
            ),
            DashboardStatItem(
                label="Database Status",
                value="SQLite Connected",
                change="Storage OK",
                trend="up",
            ),
        ],
        recent_activities=[
            ActivityItem(
                id="act-1",
                action="User Sign In",
                detail="User session authenticated successfully",
                timestamp="Just now",
                status="Success",
            ),
            ActivityItem(
                id="act-2",
                action="OpenAQ Telemetry Sync",
                detail="Realtime sensor readings synced with EPA standard",
                timestamp="5 mins ago",
                status="Healthy",
            ),
            ActivityItem(
                id="act-3",
                action="Route Ping",
                detail="Frontend Next.js connection established",
                timestamp="12 mins ago",
                status="Active",
            ),
        ],
        system_health="Operational",
        registered_users_count=total_users,
    )
