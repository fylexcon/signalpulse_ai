"""
Pydantic schemas for subscriptions
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SubscriptionBase(BaseModel):
    status: str
    current_period_end: datetime | None = None
    cancel_at_period_end: bool
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None

class SubscriptionResponse(SubscriptionBase):
    id: str
    org_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CheckoutRequest(BaseModel):
    price_id: str

class CheckoutResponse(BaseModel):
    checkout_url: str
