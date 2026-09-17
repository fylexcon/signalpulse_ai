import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight } from 'lucide-react';
import { useOrg } from '../hooks/useOrg';
import { orgApi } from '../api/organizations';
import { subscriptionApi } from '../api/billing';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge, statusBadgeVariant } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

const plans = [
  {
    name: 'Free',
    key: 'free',
    price: '$0',
    priceId: null,
    entities: '50',
    members: '1',
    apiKeys: '1',
    features: ['Basic CRUD', 'Single user', '1 API key'],
  },
  {
    name: 'Starter',
    key: 'starter',
    price: '$29',
    priceId: 'price_starter_monthly',
    entities: '1,000',
    members: '5',
    apiKeys: '5',
    features: ['Everything in Free', 'Team collaboration', 'Priority support', 'Advanced filters'],
    popular: true,
  },
  {
    name: 'Pro',
    key: 'pro',
    price: '$99',
    priceId: 'price_pro_monthly',
    entities: 'Unlimited',
    members: 'Unlimited',
    apiKeys: '20',
    features: ['Everything in Starter', 'Unlimited entities', 'Custom integrations', 'Dedicated support'],
  },
];

export function Billing() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id || '';

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => subscriptionApi.get(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage', orgId],
    queryFn: () => orgApi.getUsage(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => subscriptionApi.createCheckout(orgId, priceId),
    onSuccess: (res) => {
      window.location.href = res.data.checkout_url;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionApi.cancel(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      // Invalidate queries so that org.plan_type and subscription status refresh immediately
      queryClient.invalidateQueries({ queryKey: ['orgs'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      // Remove the query param from URL without refreshing the page
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [queryClient]);

  const currentPlan = currentOrg?.plan_type || 'free';
  const isLoading = subLoading || usageLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size={32} />
      </div>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />;
      case 'past_due': return <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />;
      case 'canceled': return <XCircle size={18} style={{ color: 'var(--danger)' }} />;
      default: return null;
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Billing</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 32 }}>
        Manage your subscription and plan
      </p>

      {/* Current Plan Card */}
      <Card padding="28px" style={{ marginBottom: 28, maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCard size={22} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Current Plan: <span className="gradient-text">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</span>
            </div>
            {subscription && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {statusIcon(subscription.status)}
                <Badge variant={statusBadgeVariant(subscription.status)}>{subscription.status}</Badge>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  · Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Usage bars */}
        {usage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <UsageBar label="Entities" used={usage.usage.entities} limit={usage.limits.max_entities} />
            <UsageBar label="Members" used={usage.usage.members} limit={usage.limits.max_members} />
            <UsageBar label="API Keys" used={usage.usage.api_keys} limit={usage.limits.max_api_keys} />
          </div>
        )}

        {subscription && subscription.status === 'active' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { if (confirm('Cancel subscription at end of billing period?')) cancelMutation.mutate(); }}
            loading={cancelMutation.isPending}
            style={{ marginTop: 20, color: 'var(--danger)' }}
          >
            Cancel Subscription
          </Button>
        )}
      </Card>

      {/* Plan Comparison */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>
        {currentPlan === 'free' ? 'Upgrade your plan' : 'All Plans'}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isUpgrade = plans.findIndex(p => p.key === currentPlan) < plans.findIndex(p => p.key === plan.key);

          return (
            <Card
              key={plan.key}
              glass={plan.popular}
              glow={plan.popular}
              padding="28px"
              style={{
                border: isCurrent
                  ? '2px solid var(--accent-primary)'
                  : plan.popular
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-subtle)',
                position: 'relative',
              }}
            >
              {isCurrent && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 14px',
                    background: 'var(--accent-gradient)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'white',
                    textTransform: 'uppercase',
                  }}
                >
                  Current Plan
                </div>
              )}

              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{plan.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: '2.25rem', fontWeight: 800 }}>{plan.price}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>/mo</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, fontSize: '0.85rem' }}>
                <div>📦 {plan.entities} entities</div>
                <div>👥 {plan.members} member{plan.members !== '1' ? 's' : ''}</div>
                <div>🔑 {plan.apiKeys} API key{plan.apiKeys !== '1' ? 's' : ''}</div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4, paddingTop: 12 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {isUpgrade && plan.priceId ? (
                <Button
                  onClick={() => checkoutMutation.mutate(plan.priceId!)}
                  loading={checkoutMutation.isPending}
                  style={{ width: '100%' }}
                >
                  Upgrade <ArrowUpRight size={16} />
                </Button>
              ) : isCurrent ? (
                <Button variant="outline" disabled style={{ width: '100%' }}>
                  Current Plan
                </Button>
              ) : (
                <Button variant="ghost" disabled style={{ width: '100%' }}>
                  —
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percentage = limit ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = limit !== null && percentage >= 80;
  const isAtLimit = limit !== null && percentage >= 100;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: isAtLimit ? 'var(--danger)' : isNearLimit ? 'var(--warning)' : 'var(--text-tertiary)' }}>
          {used} / {limit ?? '∞'}
        </span>
      </div>
      {limit !== null && (
        <div
          style={{
            height: 6,
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              background: isAtLimit
                ? 'var(--danger)'
                : isNearLimit
                  ? 'var(--warning)'
                  : 'var(--accent-gradient)',
              borderRadius: 'var(--radius-full)',
              transition: 'width var(--transition-normal)',
            }}
          />
        </div>
      )}
    </div>
  );
}
