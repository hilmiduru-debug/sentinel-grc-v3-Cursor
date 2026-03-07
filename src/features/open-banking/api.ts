/**
 * Wave 67: Open Banking & API Security Auditor — Supabase Data Layer
 *
 * Hooks for api_gateway_logs, psd2_tokens, and api_breaches tables.
 *
 * DEFENSIVE PROGRAMMING:
 *   - Zero-division risk for ratios MUST use (total_requests || 1)
 *   - Null arrays fallback to (data ?? [])
 *   - ?. field access on mapped objects
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ApiGatewayLog {
  id: string;
  tenant_id: string;
  endpoint: string;
  method: string;
  consumer_app: string;
  ip_address: string | null;
  status_code: number;
  response_time_ms: number;
  is_rate_limited: boolean;
  timestamp: string;
}

export interface Psd2Token {
  id: string;
  tenant_id: string;
  tpp_name: string;
  client_id: string;
  scopes: string[];
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface ApiBreach {
  id: string;
  tenant_id: string;
  anomaly_type: string;
  description: string;
  source_ip: string | null;
  tpp_name: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'BLOCKED' | 'FALSE_POSITIVE' | 'RESOLVED';
  detected_at: string;
  resolved_at: string | null;
}

// ---------------------------------------------------------------------------
// HOOK: Get API Logs
// ---------------------------------------------------------------------------
export function useAPILogs(limit = 100) {
  return useQuery({
    queryKey: ['api-gateway-logs', limit],
    queryFn: async (): Promise<ApiGatewayLog[]> => {
      const { data, error } = await supabase
        .from('api_gateway_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('useAPILogs: query failed', error.message);
        return [];
      }
      return (data ?? []) as ApiGatewayLog[];
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}

// ---------------------------------------------------------------------------
// HOOK: Get PSD2 Tokens
// ---------------------------------------------------------------------------
export function usePSD2Tokens() {
  return useQuery({
    queryKey: ['psd2-tokens'],
    queryFn: async (): Promise<Psd2Token[]> => {
      const { data, error } = await supabase
        .from('psd2_tokens')
        .select('*')
        .order('issued_at', { ascending: false });

      if (error) {
        console.error('usePSD2Tokens: query failed', error.message);
        return [];
      }
      return (data ?? []) as Psd2Token[];
    },
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// HOOK: Get API Breaches
// ---------------------------------------------------------------------------
export function useAPIBreaches() {
  return useQuery({
    queryKey: ['api-breaches'],
    queryFn: async (): Promise<ApiBreach[]> => {
      const { data, error } = await supabase
        .from('api_breaches')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('useAPIBreaches: query failed', error.message);
        return [];
      }
      return (data ?? []) as ApiBreach[];
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

// ---------------------------------------------------------------------------
// MUTATION: Update Breach Status
// ---------------------------------------------------------------------------
export function useUpdateAPIBreachStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status: ApiBreach['status'] }) => {
      const updateData: Partial<ApiBreach> = { status: payload.status };
      if (payload.status === 'RESOLVED' || payload.status === 'BLOCKED' || payload.status === 'FALSE_POSITIVE') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('api_breaches')
        .update(updateData)
        .eq('id', payload.id)
        .select()
        .single();

      if (error) throw error;
      return data as ApiBreach;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-breaches'] });
    },
  });
}
