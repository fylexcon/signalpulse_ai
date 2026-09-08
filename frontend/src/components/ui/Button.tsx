import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: `
    background: var(--accent-gradient);
    color: white;
    border: none;
    box-shadow: var(--shadow-sm), 0 0 20px rgba(99, 102, 241, 0.2);
  `,
  secondary: `
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
  `,
  destructive: `
    background: var(--danger);
    color: white;
    border: none;
  `,
  ghost: `
    background: transparent;
    color: var(--text-secondary);
    border: none;
  `,
  outline: `
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-default);
  `,
};

const sizeStyles: Record<string, string> = {
  sm: 'padding: 6px 14px; font-size: 0.8rem;',
  md: 'padding: 10px 20px; font-size: 0.875rem;',
  lg: 'padding: 14px 28px; font-size: 1rem;',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const baseStyle = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: var(--radius-md);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
    user-select: none;
    ${variantStyles[variant]}
    ${sizeStyles[size]}
  `;

  const cssText = baseStyle + (style ? Object.entries(style).map(([k, v]) => `${k}: ${v}`).join(';') : '');

  return (
    <button
      disabled={disabled || loading}
      style={{
        ...parseInlineStyles(baseStyle),
        opacity: disabled || loading ? 0.5 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...props}
    >
      {loading && (
        <span
          style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      )}
      {children}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}

function parseInlineStyles(cssString: string): React.CSSProperties {
  const style: Record<string, string> = {};
  cssString
    .split(';')
    .filter((s) => s.includes(':'))
    .forEach((s) => {
      const [key, ...vals] = s.split(':');
      const cleanKey = key
        .trim()
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      style[cleanKey] = vals.join(':').trim();
    });
  return style as React.CSSProperties;
}
