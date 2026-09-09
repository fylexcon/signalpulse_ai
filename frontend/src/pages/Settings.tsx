import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Users, Key, Trash2, Plus, Copy, Shield, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOrg } from '../hooks/useOrg';
import { orgApi, type OrgMember } from '../api/organizations';
import { apiKeyApi, type ApiKeyItem, type ApiKeyCreated } from '../api/billing';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

type Tab = 'profile' | 'organization' | 'api-keys';

export function Settings() {
  const [tab, setTab] = useState<Tab>('profile');
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id || '';

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'organization', label: 'Organization', icon: Users },
    { key: 'api-keys', label: 'API Keys', icon: Key },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Settings</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 32 }}>
        Manage your account, team, and integrations
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t.key ? 'var(--accent-primary)' : 'transparent'}`,
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: tab === t.key ? 600 : 400,
              transition: 'all var(--transition-fast)',
              marginBottom: -1,
            }}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab user={user} />}
      {tab === 'organization' && <OrganizationTab orgId={orgId} />}
      {tab === 'api-keys' && <ApiKeysTab orgId={orgId} />}
    </div>
  );
}

function ProfileTab({ user }: { user: any }) {
  return (
    <Card padding="28px" style={{ maxWidth: 520 }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>Profile Information</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Input label="Full Name" value={user?.full_name || ''} readOnly />
        <Input label="Email" value={user?.email || ''} readOnly />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          Account created: {user ? new Date(user.created_at).toLocaleDateString() : ''}
        </div>
      </div>
    </Card>
  );
}

function OrganizationTab({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => orgApi.listMembers(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  const inviteMutation = useMutation({
    mutationFn: () => orgApi.inviteMember(orgId, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setInviteOpen(false);
      setInviteEmail('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => orgApi.removeMember(orgId, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });

  const roleBadge = (role: string) => {
    switch (role) {
      case 'OWNER': return <Badge variant="info">{role}</Badge>;
      case 'ADMIN': return <Badge variant="warning">{role}</Badge>;
      default: return <Badge variant="default">{role}</Badge>;
    }
  };

  return (
    <div>
      <Card padding="28px" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Team Members</h2>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus size={16} /> Invite
          </Button>
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m: OrgMember) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--accent-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {m.user_full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.user_full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{m.user_email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {roleBadge(m.role)}
                  {m.role !== 'OWNER' && (
                    <button
                      onClick={() => { if (confirm('Remove this member?')) removeMutation.mutate(m.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Member">
        <form
          onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              style={{
                padding: '10px 14px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button type="submit" loading={inviteMutation.isPending} style={{ width: '100%' }}>
            Send Invite
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function ApiKeysTab({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys', orgId],
    queryFn: () => apiKeyApi.list(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => apiKeyApi.create(orgId, { label }),
    onSuccess: (res) => {
      setCreatedKey(res.data);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setLabel('');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => apiKeyApi.revoke(orgId, keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <Card padding="28px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>API Keys</h2>
          <Button size="sm" onClick={() => { setCreateOpen(true); setCreatedKey(null); }}>
            <Plus size={16} /> Generate Key
          </Button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : keys.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 40 }}>
            No API keys yet. Generate one to get started.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keys.map((k: ApiKeyItem) => (
              <div
                key={k.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{k.label}</div>
                  <code style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{k.key_prefix}</code>
                </div>
                <button
                  onClick={() => { if (confirm('Revoke this key?')) revokeMutation.mutate(k.id); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
                  title="Revoke"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={createdKey ? 'Key Created' : 'Generate API Key'}>
        {createdKey ? (
          <div>
            <div style={{
              padding: '14px',
              background: 'var(--success-subtle)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 16,
              fontSize: '0.85rem',
              color: 'var(--success)',
            }}>
              <Shield size={16} style={{ display: 'inline', marginRight: 6 }} />
              Copy this key now — you won't see it again!
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              wordBreak: 'break-all',
            }}>
              <code style={{ flex: 1 }}>{createdKey.raw_key}</code>
              <button
                onClick={() => copyKey(createdKey.raw_key)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            <Input
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Production API"
              required
            />
            <Button type="submit" loading={createMutation.isPending} style={{ width: '100%' }}>
              Generate
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
