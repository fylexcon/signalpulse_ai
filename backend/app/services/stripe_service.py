"""
Stripe service for handling checkouts, webhooks, and subscription management.

Fixes:
  - ProcessedEvent lookup uses event_id field (not id)
  - Price → Plan mapping uses config env vars instead of fragile string matching
"""
import stripe
from datetime import datetime
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.core.config import get_settings
from app.models.subscription import Subscription
from app.models.processed_event import ProcessedEvent
from app.models.organization import Organization

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY

# ── Price ID → Plan mapping (from env) ──
PRICE_TO_PLAN: dict[str, str] = {
    settings.STRIPE_STARTER_PRICE_ID: "starter",
    settings.STRIPE_PRO_PRICE_ID: "pro",
}


class StripeService:
    @staticmethod
    async def get_or_create_subscription(db: AsyncSession, org_id) -> Subscription:
        result = await db.execute(select(Subscription).where(Subscription.org_id == org_id))
        sub = result.scalar_one_or_none()
        
        if not sub:
            sub = Subscription(
                id=str(uuid.uuid4()),
                org_id=org_id,
                status="inactive"
            )
            db.add(sub)
            await db.commit()
            await db.refresh(sub)
            
        return sub

    @staticmethod
    async def create_checkout_session(db: AsyncSession, org_id, price_id: str, user_email: str) -> str:
        sub = await StripeService.get_or_create_subscription(db, org_id)
        
        session_params = {
            "payment_method_types": ["card"],
            "line_items": [{"price": price_id, "quantity": 1}],
            "mode": "subscription",
            "success_url": f"{settings.FRONTEND_URL}/billing?success=true",
            "cancel_url": f"{settings.FRONTEND_URL}/billing?canceled=true",
            "client_reference_id": str(org_id),
            "customer_email": user_email if not sub.stripe_customer_id else None,
            "customer": sub.stripe_customer_id if sub.stripe_customer_id else None,
        }
        
        try:
            checkout_session = stripe.checkout.Session.create(**session_params)
            return checkout_session.url
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    async def cancel_subscription(db: AsyncSession, org_id) -> Subscription:
        sub = await StripeService.get_or_create_subscription(db, org_id)
        if not sub.stripe_subscription_id:
            raise HTTPException(status_code=400, detail="No active Stripe subscription found.")
        
        try:
            stripe.Subscription.modify(
                sub.stripe_subscription_id,
                cancel_at_period_end=True
            )
            sub.cancel_at_period_end = True
            await db.commit()
            await db.refresh(sub)
            return sub
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    async def process_webhook(db: AsyncSession, payload: bytes, sig_header: str):
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")

        # ── Idempotency check (FIXED: uses event_id field, not id) ──
        result = await db.execute(
            select(ProcessedEvent).where(ProcessedEvent.event_id == event.id)
        )
        if result.scalar_one_or_none():
            return {"status": "already_processed"}

        # Handle event types
        if event.type == 'checkout.session.completed':
            await StripeService._handle_checkout_completed(db, event.data.object)
        elif event.type == 'customer.subscription.updated':
            await StripeService._handle_subscription_updated(db, event.data.object)
        elif event.type == 'customer.subscription.deleted':
            await StripeService._handle_subscription_deleted(db, event.data.object)

        # Record event for idempotency
        processed_event = ProcessedEvent(event_id=event.id, event_type=event.type)
        db.add(processed_event)
        await db.commit()
        
        return {"status": "success"}

    @staticmethod
    async def _handle_checkout_completed(db: AsyncSession, session: dict):
        org_id = session.get("client_reference_id")
        if not org_id:
            return
            
        sub = await StripeService.get_or_create_subscription(db, org_id)
        sub.stripe_customer_id = session.get("customer")
        sub.stripe_subscription_id = session.get("subscription")
        
        db.add(sub)
        await db.commit()

    @staticmethod
    async def _handle_subscription_updated(db: AsyncSession, subscription_obj: dict):
        stripe_sub_id = subscription_obj.get("id")
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = result.scalar_one_or_none()
        
        if not sub:
            return
            
        sub.status = subscription_obj.get("status")
        current_period_end_ts = subscription_obj.get("current_period_end")
        if current_period_end_ts:
            sub.current_period_end = datetime.fromtimestamp(current_period_end_ts)
        
        sub.cancel_at_period_end = subscription_obj.get("cancel_at_period_end", False)
        
        # ── Update org plan_type using config-based price mapping (FIXED) ──
        result_org = await db.execute(select(Organization).where(Organization.id == sub.org_id))
        org = result_org.scalar_one_or_none()
        if org:
            if sub.status == 'active':
                items = subscription_obj.get("items", {}).get("data", [])
                plan_type = "starter"  # default for active subscriptions
                if items:
                    price_id = items[0].get("price", {}).get("id", "")
                    plan_type = PRICE_TO_PLAN.get(price_id, "starter")
                org.plan_type = plan_type
            else:
                org.plan_type = "free"
            
            db.add(org)

        db.add(sub)
        await db.commit()

    @staticmethod
    async def _handle_subscription_deleted(db: AsyncSession, subscription_obj: dict):
        stripe_sub_id = subscription_obj.get("id")
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = result.scalar_one_or_none()
        
        if not sub:
            return
            
        sub.status = "canceled"
        sub.cancel_at_period_end = False
        
        # Revert to free plan
        result_org = await db.execute(select(Organization).where(Organization.id == sub.org_id))
        org = result_org.scalar_one_or_none()
        if org:
            org.plan_type = "free"
            db.add(org)
            
        db.add(sub)
        await db.commit()
