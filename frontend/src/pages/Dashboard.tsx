import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit3, AlertCircle, ThumbsUp, Star, Sparkles } from 'lucide-react';
import { useOrg } from '../hooks/useOrg';
import { feedbackApi, type FeedbackItem, type FeedbackItemCreate, type FeedbackItemUpdate } from '../api/feedback';
import { orgApi } from '../api/organizations';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export function Dashboard() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<FeedbackItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('bug');
  const [formSentiment, setFormSentiment] = useState('neutral');
  const [formStatus, setFormStatus] = useState('open');
  const [formEmail, setFormEmail] = useState('');

  const orgId = currentOrg?.id || '';

  const { data: items = [] } = useQuery<FeedbackItem[]>({
    queryKey: ['feedback', orgId],
    queryFn: () => feedbackApi.list(orgId),
    enabled: !!orgId,
    refetchInterval: (query) => {
      const currentItems = query.state.data as FeedbackItem[] | undefined;
      if (!currentItems) return false;
      const pending = currentItems.some((i: FeedbackItem) => i.ai_summary === null || (i.sentiment === 'neutral' && i.category === 'general' && !i.ai_summary));
      return pending ? 4000 : false;
    }
  });

  // Smart polling: only poll when there are items waiting for AI analysis
  const hasPendingAI = useMemo(
    () => items.some((i: FeedbackItem) => i.ai_summary === null || i.sentiment === 'neutral' && i.category === 'general' && !i.ai_summary),
    [items]
  );

  const { data: usage } = useQuery({
    queryKey: ['usage', orgId],
    queryFn: () => orgApi.getUsage(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (data: FeedbackItemCreate) => feedbackApi.create(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FeedbackItemUpdate }) =>
      feedbackApi.update(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feedbackApi.delete(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });

  const openCreate = () => {
    setEditItem(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('bug');
    setFormSentiment('neutral');
    setFormStatus('open');
    setFormEmail('');
    setModalOpen(true);
  };

  const openEdit = (item: FeedbackItem) => {
    setEditItem(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormCategory(item.category);
    setFormSentiment(item.sentiment);
    setFormStatus(item.status);
    setFormEmail(item.customer_email || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      updateMutation.mutate({
        id: editItem.id,
        data: {
          title: formTitle,
          content: formContent,
          category: formCategory,
          sentiment: formSentiment,
          status: formStatus,
        },
      });
    } else {
      createMutation.mutate({
        title: formTitle,
        content: formContent,
        customer_email: formEmail,
        source: 'manual',
        category: formCategory,
        sentiment: formSentiment,
        status: formStatus,
      });
    }
  };

  const entityLimit = usage?.limits?.max_entities;
  const entityCount = usage?.usage?.entities || 0;
  const atLimit = entityLimit !== null && entityLimit !== undefined && entityCount >= entityLimit;

  // Stats
  const statsCards = [
    { icon: AlertCircle, label: 'Bugs', value: items.filter((e: FeedbackItem) => e.category === 'bug').length, color: 'var(--danger)' },
    { icon: Star, label: 'Feature Requests', value: items.filter((e: FeedbackItem) => e.category === 'feature_request').length, color: 'var(--accent-primary)' },
    { icon: ThumbsUp, label: 'Praise', value: items.filter((e: FeedbackItem) => e.category === 'praise').length, color: 'var(--success)' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Feedback Hub</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Triaging and analyzing customer feedback
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {entityLimit !== null && entityLimit !== undefined && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              {entityCount} / {entityLimit} feedback items
            </span>
          )}
          <Button onClick={openCreate} disabled={atLimit}>
            <Plus size={18} /> New Feedback
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {statsCards.map((s) => (
          <Card key={s.label} padding="20px">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: `${s.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{s.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Kanban-ish Board / Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {['open', 'under_review', 'resolved'].map((statusStr) => {
          const colItems = items.filter((i: FeedbackItem) => i.status === statusStr);
          return (
            <div key={statusStr}>
              <h3 style={{ textTransform: 'capitalize', fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
                {statusStr.replace('_', ' ')} ({colItems.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {colItems.map((item: FeedbackItem) => (
                  <Card key={item.id} padding="16px">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Badge variant={item.category === 'bug' ? 'danger' : item.category === 'praise' ? 'success' : 'default'}>
                        {item.category.replace('_', ' ')}
                      </Badge>
                      <div style={{ display: 'flex', gap: 6 }}>
                         <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><Edit3 size={14} /></button>
                         <button onClick={() => { if(confirm('Delete?')) deleteMutation.mutate(item.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{item.title}</h4>
                    {item.ai_summary && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Sparkles size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--accent-primary)' }}>
                          {item.ai_summary}
                        </span>
                      </div>
                    )}
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{item.content}</p>
                    {item.customer_email && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        From: {item.customer_email}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editItem ? 'Edit Feedback' : 'Log Feedback'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="E.g. Login page is broken" required />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Content</label>
            <textarea
              value={formContent} onChange={(e) => setFormContent(e.target.value)} required rows={4}
              style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {!editItem && (
            <Input label="Customer Email (optional)" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="customer@example.com" />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Category</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="bug">Bug</option>
                <option value="feature_request">Feature Request</option>
                <option value="general">General</option>
                <option value="praise">Praise</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Sentiment</label>
              <select value={formSentiment} onChange={(e) => setFormSentiment(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="open">Open</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <Button type="submit" loading={createMutation.isPending || updateMutation.isPending} style={{ width: '100%', marginTop: 8 }}>
            {editItem ? 'Update' : 'Save'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
