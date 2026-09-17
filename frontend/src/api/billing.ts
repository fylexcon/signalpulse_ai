import api from './client';

export interface ApiKeyItem {
  id: string;
  label: string;
  key_prefix: string;
  permissions: Record<string, unknown>;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated {
  id: string;
  label: string;
  raw_key: string;
  permissions: Record<string, unknown>;
  created_at: string;
}

export interface SubscriptionData {
  id: string;
  org_id: string;
  status: string;
  current_period_end: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  created_at: string;
}

export const apiKeyApi = {
  create: (orgId: string, data: { label: string; permissions?: Record<string, unknown> }) =>
    api.post<ApiKeyCreated>(`/orgs/${orgId}/api-keys`, data),
  list: (orgId: string) => api.get<ApiKeyItem[]>(`/orgs/${orgId}/api-keys`),
  revoke: (orgId: string, keyId: string) => api.delete(`/orgs/${orgId}/api-keys/${keyId}`),
};

export const subscriptionApi = {
  get: (orgId: string) => api.get<SubscriptionData | null>(`/orgs/${orgId}/subscription`),
  createCheckout: (orgId: string, priceId: string) =>
    api.post<{ checkout_url: string }>(`/orgs/${orgId}/subscription/checkout`, { price_id: priceId }),
  cancel: (orgId: string) => api.post(`/orgs/${orgId}/subscription/cancel`),
};
