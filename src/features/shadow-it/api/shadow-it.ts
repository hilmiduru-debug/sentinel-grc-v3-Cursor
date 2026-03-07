import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type AssetStatus = 'discovered' | 'blocked' | 'approved' | 'under_review';
export type AlertType = 'data_exfiltration_risk' | 'policy_violation';
export type ActionTaken = 'blocked_by_proxy' | 'alerted' | 'allowed';

export interface ShadowAsset {
  id: string;
  tenant_id: string;
  app_name: string;
  category: string;
  risk_score: number;
  risk_level: RiskLevel;
  active_users_count: number;
  total_traffic_mb: number;
  status: AssetStatus;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface UnauthorizedAILog {
  id: string;
  tenant_id: string;
  asset_id: string | null;
  device_ip: string;
  user_email: string | null;
  ai_service_name: string;
  payload_size_bytes: number;
  alert_type: AlertType;
  severity: RiskLevel;
  action_taken: ActionTaken;
  description: string | null;
  occurred_at: string;
}

// ─── API Hooks ────────────────────────────────────────────────────────────────

export function useShadowAssets(filters?: { status?: AssetStatus; category?: string }) {
  return useQuery({
    queryKey: ['shadow-assets', TENANT_ID, filters],
    queryFn: async () => {
      let query = supabase
        .from('shadow_it_assets')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('risk_score', { ascending: false });

      if (filters?.status)   query = query.eq('status', filters.status);
      if (filters?.category) query = query.eq('category', filters.category);

      const { data, error } = await query;
      if (error) {
        console.error('[Wave 72] İzinsiz varlıklar alınamadı:', error.message);
        return [] as ShadowAsset[];
      }
      return (data ?? []) as ShadowAsset[];
    },
    staleTime: 30_000,
  });
}

export function useAILogs() {
  return useQuery({
    queryKey: ['unauthorized-ai-logs', TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unauthorized_ai_logs')
        .select('*, shadow_it_assets(app_name)')
        .eq('tenant_id', TENANT_ID)
        .order('occurred_at', { ascending: false });

      if (error) {
        console.error('[Wave 72] AI sızıntı logları alınamadı:', error.message);
        return [] as (UnauthorizedAILog & { app_name?: string })[];
      }

      return ((data as any[]) ?? []).map((row) => ({
        ...row,
        app_name: row.shadow_it_assets?.app_name,
      }));
    },
    staleTime: 30_000,
  });
}

export function useUpdateAssetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AssetStatus }) => {
      const { error } = await supabase
        .from('shadow_it_assets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shadow-assets'] }),
  });
}

export function useDataLeakageStats() {
  return useQuery({
    queryKey: ['shadow-leakage-stats', TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shadow_it_assets')
        .select('total_traffic_mb, risk_level')
        .eq('tenant_id', TENANT_ID);

      if (error) return { totalTrafficMB: 0, criticalRatio: 0 };

      const rows = data ?? [];
      const totalTraffic = rows.reduce((sum, row) => sum + Number(row.total_traffic_mb || 0), 0);
      const criticalTraffic = rows
        .filter(r => r.risk_level === 'critical' || r.risk_level === 'high')
        .reduce((sum, row) => sum + Number(row.total_traffic_mb || 0), 0);

      // (total_traffic || 1) Div-by-zero koruması
      const criticalRatio = totalTraffic === 0 ? 0 : (criticalTraffic / (totalTraffic || 1)) * 100;

      return {
        totalTrafficMB: totalTraffic,
        criticalRatio: Math.round(criticalRatio * 10) / 10,
      };
    },
    staleTime: 45_000,
  });
}
