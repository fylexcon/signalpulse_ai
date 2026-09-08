import api from './client';

export interface Organization {
  id: string;
  name: string;
  plan_type: string;
  owner_id: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_email: string;
  user_full_name: string;
}

export interface UsageData {
  plan: string;
  usage: { entities: number; members: number; api_keys: number };
  limits: { max_entities: number | null; max_members: number | null; max_api_keys: number | null };
}

export const orgApi = {
  create: (data: { name: string }) => api.post<Organization>('/organizations', data),
  list: () => api.get<Organization[]>('/organizations'),
  get: (id: string) => api.get<Organization>(`/organizations/${id}`),
  update: (id: string, data: { name?: string }) => api.patch<Organization>(`/organizations/${id}`, data),
  listMembers: (orgId: string) => api.get<OrgMember[]>(`/organizations/${orgId}/members`),
  inviteMember: (orgId: string, data: { email: string; role: string }) =>
    api.post<OrgMember>(`/organizations/${orgId}/members`, data),
  changeMemberRole: (orgId: string, memberId: string, data: { role: string }) =>
    api.patch<OrgMember>(`/organizations/${orgId}/members/${memberId}`, data),
  removeMember: (orgId: string, memberId: string) =>
    api.delete(`/organizations/${orgId}/members/${memberId}`),
  getUsage: (orgId: string) => api.get<UsageData>(`/orgs/${orgId}/usage`),
};
