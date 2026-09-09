import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  style?: React.CSSProperties;
}

const colors: Record<string, { bg: string; color: string }> = {
  success: { bg: 'var(--success-subtle)', color: 'var(--success)' },
  warning: { bg: 'var(--warning-subtle)', color: 'var(--warning)' },
  danger: { bg: 'var(--danger-subtle)', color: 'var(--danger)' },
  info: { bg: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)' },
  default: { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
};

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const { bg, color } = colors[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        fontSize: '0.75rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        backgroundColor: bg,
        color,
        textTransform: 'capitalize',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function statusBadgeVariant(
  status: string
): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'past_due':
    case 'trialing':
      return 'warning';
    case 'canceled':
    case 'deleted':
      return 'danger';
    case 'archived':
      return 'info';
    default:
      return 'default';
  }
}
