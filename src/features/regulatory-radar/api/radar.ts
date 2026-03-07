/**
 * Regulatory Radar — Veri Katmanı
 * features/regulatory-radar/api/radar.ts  (Wave 47)
 *
 * Çökme Kalkanları:
 *   (signals || []).map(...)   → boş dizi kalkanı
 *   (total || 1)               → sıfıra bölünme koruması
 *   42P01 → graceful boş dizi
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import toast from 'react-hot-toast';

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface RegulatoryBulletin {
  id: string;
  bulletin_code: string;
  title: string;
  summary: string | null;
  full_text_url: string | null;
  source_authority: string;
  category: 'REGULATION' | 'GUIDANCE' | 'CIRCULAR' | 'CONSULTATION' | 'DIRECTIVE' | 'STANDARD';
  impact_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'DRAFT' | 'PUBLISHED' | 'ENACTED' | 'REPEALED' | 'CONSULTATION';
  published_at: string | null;
  effective_date: string | null;
  comment_deadline: string | null;
  affected_sectors: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyImpactAlert {
  id: string;
  bulletin_id: string;
  bulletin_code: string;
  internal_policy_ref: string;
  department: string;
  impact_description: string;
  required_action: string;
  action_deadline: string | null;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED';
  completion_pct: number;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface RadarSummaryRow {
  source_authority: string;
  impact_level: string;
  bulletin_count: number;
  open_alerts: number;
  avg_completion_pct: number;
}

// ─── Hook: useRadarSignals ─────────────────────────────────────────────────────

export function useRadarSignals(filters?: {
  impactLevel?: RegulatoryBulletin['impact_level'];
  authority?: string;
  status?: RegulatoryBulletin['status'];
}) {
  return useQuery<RegulatoryBulletin[]>({
    queryKey: ['radar-signals', filters],
    queryFn: async () => {
      let q = supabase
        .from('regulatory_bulletins')
        .select('*')
        .order('impact_level', { ascending: true })   // CRITICAL önce (alphabetic sırası)
        .order('published_at', { ascending: false });

      if (filters?.impactLevel) q = q.eq('impact_level', filters.impactLevel);
      if (filters?.authority)   q = q.eq('source_authority', filters.authority);
      if (filters?.status)      q = q.eq('status', filters.status);

      const { data, error } = await q;

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      // (signals || []) boş dizi kalkanı
      return (data || []) as RegulatoryBulletin[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Hook: useImpactAnalysis ──────────────────────────────────────────────────

export function useImpactAnalysis(bulletinId?: string | null) {
  return useQuery<PolicyImpactAlert[]>({
    queryKey: ['impact-analysis', bulletinId],
    enabled: !!bulletinId,
    queryFn: async () => {
      if (!bulletinId) return [];

      const { data, error } = await supabase
        .from('policy_impact_alerts')
        .select('*')
        .eq('bulletin_id', bulletinId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || []) as PolicyImpactAlert[];
    },
  });
}

// ─── Hook: useAllImpactAlerts ──────────────────────────────────────────────────

export function useAllImpactAlerts(status?: PolicyImpactAlert['status']) {
  return useQuery<PolicyImpactAlert[]>({
    queryKey: ['impact-alerts-all', status],
    queryFn: async () => {
      let q = supabase
        .from('policy_impact_alerts')
        .select('*')
        .order('priority', { ascending: true })
        .order('action_deadline', { ascending: true });

      if (status) q = q.eq('status', status);

      const { data, error } = await q;
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || []) as PolicyImpactAlert[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Hook: useRadarSummary ─────────────────────────────────────────────────────

export interface RadarKPI {
  totalSignals: number;
  criticalCount: number;
  openAlerts: number;
  avgCompletionPct: number;
  authorityCounts: Record<string, number>;
}

export function useRadarSummary() {
  return useQuery<RadarKPI>({
    queryKey: ['radar-kpi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulatory_radar_summary')
        .select('*');

      if (error) {
        if (error.code === '42P01') {
          return { totalSignals: 0, criticalCount: 0, openAlerts: 0, avgCompletionPct: 0, authorityCounts: {} };
        }
        throw error;
      }

      const rows = (data || []) as RadarSummaryRow[];

      const totalSignals   = rows.reduce((s, r) => s + (r?.bulletin_count || 0), 0);
      const criticalCount  = rows.filter((r) => r?.impact_level === 'CRITICAL')
                                  .reduce((s, r) => s + (r?.bulletin_count || 0), 0);
      const openAlerts     = rows.reduce((s, r) => s + (r?.open_alerts || 0), 0);
      // Ortalama tamamlanma — sıfıra bölünme: (rows.length || 1)
      const avgCompletionPct = Math.round(
        rows.reduce((s, r) => s + (r?.avg_completion_pct || 0), 0) / (rows.length || 1)
      );

      const authorityCounts: Record<string, number> = {};
      (rows || []).forEach((r) => {
        if (r?.source_authority) {
          authorityCounts[r.source_authority] = (authorityCounts[r.source_authority] || 0) + (r.bulletin_count || 0);
        }
      });

      return { totalSignals, criticalCount, openAlerts, avgCompletionPct, authorityCounts };
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Hook: useUpdateAlertStatus ───────────────────────────────────────────────

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, status, completion_pct,
    }: { id: string; status: PolicyImpactAlert['status']; completion_pct?: number }) => {
      const payload: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (completion_pct !== undefined) payload.completion_pct = completion_pct;
      if (status === 'RESOLVED') payload.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from('policy_impact_alerts')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['impact-alerts-all'] });
      void qc.invalidateQueries({ queryKey: ['impact-analysis'] });
      void qc.invalidateQueries({ queryKey: ['radar-kpi'] });
      toast.success('Uyarı durumu güncellendi.');
    },
    onError: (err: Error) => {
      toast.error(`Güncelleme başarısız: ${err.message}`);
    },
  });
}
