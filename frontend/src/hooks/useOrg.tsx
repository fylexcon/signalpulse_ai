/**
 * Organization context — manages current selected org.
 * Only orgId is persisted in localStorage (safe — not a secret).
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orgApi, type Organization } from '../api/organizations';
import { useAuth } from './useAuth';

interface OrgContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  switchOrg: (orgId: string) => void;
  refetchOrgs: () => void;
}

const OrgContext = createContext<OrgContextType | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    () => localStorage.getItem('selectedOrgId')
  );

  const { data: organizations = [], isLoading, refetch } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => orgApi.list().then((res) => res.data),
    enabled: isAuthenticated,
  });

  // Auto-select first org if none selected
  useEffect(() => {
    if (organizations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(organizations[0].id);
      localStorage.setItem('selectedOrgId', organizations[0].id);
    }
  }, [organizations, selectedOrgId]);

  const currentOrg = organizations.find((o) => o.id === selectedOrgId) || organizations[0] || null;

  const switchOrg = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    localStorage.setItem('selectedOrgId', orgId);
  }, []);

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        organizations,
        isLoading,
        switchOrg,
        refetchOrgs: refetch,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) throw new Error('useOrg must be used within OrgProvider');
  return context;
}
