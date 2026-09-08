import React from 'react';

interface CardProps {
  children: React.ReactNode;
  glass?: boolean;
  glow?: boolean;
  padding?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({
  children,
  glass = false,
  glow = false,
  padding = '24px',
  style,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: glass ? 'var(--bg-glass)' : 'var(--bg-secondary)',
        backdropFilter: glass ? 'blur(20px)' : undefined,
        WebkitBackdropFilter: glass ? 'blur(20px)' : undefined,
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding,
        boxShadow: glow ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
        transition: 'all var(--transition-normal)',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = glow ? 'var(--shadow-glow)' : 'var(--shadow-sm)';
        }
      }}
    >
      {children}
    </div>
  );
}
