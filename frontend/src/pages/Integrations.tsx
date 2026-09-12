import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Key, Shield, Code, Plus, Trash2 } from 'lucide-react';
import { useOrg } from '../hooks/useOrg';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import api from '../api/client';

export function Integrations() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id || '';
  
  const [modalOpen, setModalOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [rawKey, setRawKey] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api_keys', orgId],
    queryFn: () => api.get(`/orgs/${orgId}/api-keys`).then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (label: string) => api.post(`/orgs/${orgId}/api-keys`, { label }),
    onSuccess: (res) => {
      setRawKey(res.data.raw_key);
      queryClient.invalidateQueries({ queryKey: ['api_keys'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) => api.delete(`/orgs/${orgId}/api-keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api_keys'] });
    },
  });

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newKeyLabel);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const curlExample = `curl -X POST http://localhost:8000/api/v1/public/feedback \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Bug on checkout page",
    "content": "When I click purchase, it freezes.",
    "customer_email": "user@example.com"
  }'`;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Integrations & API</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Connect your application to send feedback automatically.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <Card padding="24px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Key size={24} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>API Keys</h2>
          </div>
          
          <Button onClick={() => { setRawKey(null); setNewKeyLabel(''); setModalOpen(true); }} style={{ marginBottom: 20 }}>
            <Plus size={16} /> Generate New Key
          </Button>

          {isLoading ? <Spinner size={24} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {keys.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No active API keys.</p>}
              {keys.map((k: any) => (
                <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{k.key_prefix}</div>
                  </div>
                  <button onClick={() => { if(confirm('Revoke this key?')) deleteMutation.mutate(k.id); }} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="24px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Code size={24} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Quick Start</h2>
          </div>
          
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Use the snippet below to add a floating feedback button directly to your website.
          </p>

          <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 'var(--radius-md)', position: 'relative', overflowX: 'auto', fontSize: '0.85rem', fontFamily: 'monospace', marginBottom: 20 }}>
            <button onClick={() => copyToClipboard(`<script src="http://localhost:5173/widget.js" data-api-key="YOUR_API_KEY" data-api-url="http://localhost:8000/api/v1/public/feedback"></script>`)} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, borderRadius: 4 }}>
              <Copy size={14} />
            </button>
            <pre style={{ margin: 0 }}>&lt;script src="http://localhost:5173/widget.js" <br/>  data-api-key="YOUR_API_KEY"<br/>  data-api-url="http://localhost:8000/api/v1/public/feedback"&gt;<br/>&lt;/script&gt;</pre>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>cURL Example</h3>
          <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 'var(--radius-md)', position: 'relative', overflowX: 'auto', fontSize: '0.85rem', fontFamily: 'monospace' }}>
            <button onClick={() => copyToClipboard(curlExample)} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, borderRadius: 4 }}>
              <Copy size={14} />
            </button>
            <pre style={{ margin: 0 }}>{curlExample}</pre>
          </div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, background: 'rgba(56, 189, 248, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
            <Shield size={20} style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
              For frontend widget integrations, do not expose your raw API key. Instead, route the requests through your own backend.
            </p>
          </div>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Generate API Key">
        {!rawKey ? (
          <form onSubmit={handleCreateKey} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Key Label" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="e.g. Production Web Widget" required />
            <Button type="submit" loading={createMutation.isPending}>Create Key</Button>
          </form>
        ) : (
          <div>
            <div style={{ padding: 16, background: 'var(--success)', color: '#fff', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: '0.9rem' }}>
              Key generated successfully! Please copy it now, you won't be able to see it again.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <code style={{ flex: 1, padding: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                {rawKey}
              </code>
              <Button variant="outline" onClick={() => copyToClipboard(rawKey)}>Copy</Button>
            </div>
            <Button style={{ width: '100%' }} onClick={() => setModalOpen(false)}>Done</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
