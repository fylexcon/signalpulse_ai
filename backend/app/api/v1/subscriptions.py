"""
Subscription & Billing API routes.
Includes Stripe webhook endpoint with signature verification and idempotency.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_current_org, require_org_role
from app.core.database import get_db
from app.core.plan_limits import PLAN_LIMITS, get_usage
from app.models.organization import Organization
from app.models.user import User
from app.schemas.subscription import CheckoutRequest, CheckoutResponse, SubscriptionResponse
from app.services.stripe_service import StripeService

router = APIRouter()


# ── Stripe Webhook (no auth — verified via signature) ──

@router.post("/webhooks/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    stripe_signature: str = Header(alias="Stripe-Signature"),
):
    """
    Handle Stripe webhook events.
    - Reads raw body for signature verification (before JSON parsing).
    - Checks idempotency via processed_events table.
    """
    raw_body = await request.body()
    return await StripeService.process_webhook(db, raw_body, stripe_signature)


# ── Subscription Status ──

@router.get("/orgs/{org_id}/subscription", response_model=SubscriptionResponse | None)
async def get_subscription(
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Get current subscription status for the organization."""
    sub = await StripeService.get_or_create_subscription(db, org.id)
    return SubscriptionResponse.model_validate(sub)


# ── Checkout Session ──

@router.post("/orgs/{org_id}/subscription/checkout", response_model=CheckoutResponse)
async def create_checkout(
    data: CheckoutRequest,
    org: Organization = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    _role: str = Depends(require_org_role(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session and return the URL."""
    checkout_url = await StripeService.create_checkout_session(
        db=db,
        org_id=org.id,
        price_id=data.price_id,
        user_email=current_user.email,
    )
    return CheckoutResponse(checkout_url=checkout_url)


# ── Cancel Subscription ──

@router.post(
    "/orgs/{org_id}/subscription/cancel",
    status_code=status.HTTP_200_OK,
)
async def cancel_subscription(
    org: Organization = Depends(get_current_org),
    _role: str = Depends(require_org_role(["OWNER"])),
    db: AsyncSession = Depends(get_db),
):
    """Cancel the subscription at the end of the current billing period."""
    await StripeService.cancel_subscription(db, org.id)
    return {"detail": "Subscription will be canceled at the end of the current period"}


# ── Usage & Limits ──

@router.get("/orgs/{org_id}/usage")
async def get_org_usage(
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Get current resource usage and plan limits for the organization."""
    usage = await get_usage(db, org.id)
    limits = PLAN_LIMITS.get(org.plan_type, PLAN_LIMITS["free"])
    return {
        "plan": org.plan_type,
        "usage": usage,
        "limits": limits,
    }
