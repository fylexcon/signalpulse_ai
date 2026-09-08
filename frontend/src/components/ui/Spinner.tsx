import React from 'react';

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid var(--border-default)`,
        borderTop: `3px solid var(--accent-primary)`,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
      }}
    >
      <Spinner size={40} />
    </div>
  );
}
