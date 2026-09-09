import api from './client';

export interface FeedbackItem {
  id: string;
  org_id: string;
  title: string;
  content: string;
  customer_email: string | null;
  ai_summary: string | null;
  source: string;
  category: string;
  sentiment: string;
  status: string;
  created_at: string;
}

export interface FeedbackItemCreate {
  title: string;
  content: string;
  customer_email?: string;
  source?: string;
  category?: string;
  sentiment?: string;
  status?: string;
}

export interface FeedbackItemUpdate {
  title?: string;
  content?: string;
  category?: string;
  sentiment?: string;
  status?: string;
}

export const feedbackApi = {
  list: async (orgId: string): Promise<FeedbackItem[]> => {
    const { data } = await api.get(`/orgs/${orgId}/feedback`);
    return data;
  },

  create: async (orgId: string, item: FeedbackItemCreate): Promise<FeedbackItem> => {
    const { data } = await api.post(`/orgs/${orgId}/feedback`, item);
    return data;
  },

  get: async (orgId: string, itemId: string): Promise<FeedbackItem> => {
    const { data } = await api.get(`/orgs/${orgId}/feedback/${itemId}`);
    return data;
  },

  update: async (
    orgId: string,
    itemId: string,
    item: FeedbackItemUpdate
  ): Promise<FeedbackItem> => {
    const { data } = await api.patch(`/orgs/${orgId}/feedback/${itemId}`, item);
    return data;
  },

  delete: async (orgId: string, itemId: string): Promise<void> => {
    await api.delete(`/orgs/${orgId}/feedback/${itemId}`);
  },
};
