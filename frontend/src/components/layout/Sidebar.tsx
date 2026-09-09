import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  ChevronDown,
  Link,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOrg } from '../../hooks/useOrg';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/integrations', icon: Link, label: 'Integrations' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { currentOrg, organizations, switchOrg } = useOrg();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      style={{
        width: collapsed ? 72 : 260,
        height: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-normal)',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header / Org Switcher */}
      <div style={{ padding: collapsed ? '16px 12px' : '16px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        {!collapsed && (
          <div
            style={{ position: 'relative' }}
          >
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all var(--transition-fast)',
              }}
            >
              <Building2 size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentOrg?.name || 'Select Workspace'}
              </span>
              <ChevronDown size={16} style={{ color: 'var(--text-tertiary)', transform: orgDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
            </button>

            {orgDropdownOpen && organizations.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 50,
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                }}
              >
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrg(org.id);
                      setOrgDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: org.id === currentOrg?.id ? 'var(--accent-primary-subtle)' : 'transparent',
                      border: 'none',
                      color: org.id === currentOrg?.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      if (org.id !== currentOrg?.id)
                        e.currentTarget.style.background = 'var(--bg-glass-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (org.id !== currentOrg?.id)
                        e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Building2 size={22} style={{ color: 'var(--accent-primary)' }} />
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: collapsed ? '12px' : '10px 14px',
              borderRadius: 'var(--radius-md)',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-primary-subtle)' : 'transparent',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 400,
              transition: 'all var(--transition-fast)',
              justifyContent: collapsed ? 'center' : 'flex-start',
            })}
          >
            <Icon size={20} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: collapsed ? '12px' : '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {!collapsed && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-full)',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'white',
                flexShrink: 0,
              }}
            >
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handleLogout}
            title="Log out"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8,
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-md)',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <LogOut size={18} />
            {!collapsed && 'Log out'}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
