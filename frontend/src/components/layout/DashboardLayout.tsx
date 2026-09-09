import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { OrgProvider } from '../../hooks/useOrg';

export function DashboardLayout() {
  return (
    <OrgProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            padding: '32px 40px',
            overflowY: 'auto',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }} className="fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </OrgProvider>
  );
}
