/**
 * CCM Radarı — ccm_alerts tablosuna React Query ile bağlanır.
 * Aktif uyarılar: status = 'OPEN' | 'INVESTIGATING'.
 * Mock yok; tüm veri Supabase'den.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import type { CCMAlert } from '@/entities/ccm/types';

const QUERY_KEY = ['ccm-alerts'];

interface CCMAlertRow {
  id: string;
  rule_triggered: string;
  risk_score: number;
  severity: string;
  title: string;
  description: string | null;
  evidence_data: Record<string, unknown> | null;
  related_entity_id: string | null;
  status: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
}

function mapRowToAlert(row: CCMAlertRow): CCMAlert {
  return {
    id: row.id,
    rule_triggered: row.rule_triggered ?? 'CUSTOM',
    risk_score: Number(row.risk_score) ?? 0,
    severity: (row.severity ?? 'MEDIUM') as CCMAlert['severity'],
    title: row.title ?? '',
    description: row.description ?? '',
    evidence_data: (row.evidence_data as Record<string, unknown>) ?? {},
    related_entity_id: row.related_entity_id ?? '',
    status: (row.status ?? 'OPEN') as CCMAlert['status'],
    assigned_to: row.assigned_to ?? '',
    resolved_at: row.resolved_at ?? null,
    created_at: row.created_at,
  };
}

async function fetchActiveCCMAlerts(): Promise<CCMAlert[]> {
  const { data, error } = await supabase
    .from('ccm_alerts')
    .select('id, rule_triggered, risk_score, severity, title, description, evidence_data, related_entity_id, status, assigned_to, resolved_at, created_at')
    .in('status', ['OPEN', 'INVESTIGATING'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapRowToAlert(row as CCMAlertRow));
}

export interface InsertCCMAlertInput {
  title: string;
  description: string;
  severity: CCMAlert['severity'];
  rule_triggered?: string;
  risk_score?: number;
  evidence_data?: Record<string, unknown>;
}

async function insertCCMAlertInDb(input: InsertCCMAlertInput): Promise<CCMAlert> {
  const row = {
    rule_triggered: input.rule_triggered ?? 'CUSTOM',
    risk_score: input.risk_score ?? 95,
    severity: input.severity,
    title: input.title,
    description: input.description,
    evidence_data: (input.evidence_data ?? {}) as Record<string, unknown>,
    status: 'OPEN',
  };

  const { data, error } = await supabase
    .from('ccm_alerts')
    .insert(row)
    .select('id, rule_triggered, risk_score, severity, title, description, evidence_data, related_entity_id, status, assigned_to, resolved_at, created_at')
    .single();

  if (error) throw error;
  return mapRowToAlert(data as CCMAlertRow);
}

export function useCCMAlerts() {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchActiveCCMAlerts,
  });

  return {
    alerts,
    isLoading,
    refetch,
  };
}

export function useInsertCCMAlert() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: insertCCMAlertInDb,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    insertAlert: mutation.mutateAsync,
    isInserting: mutation.isPending,
    mutation,
  };
}
