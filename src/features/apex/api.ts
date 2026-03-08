/**
 * Wave 76: Apex Dashboard (God's Eye View) — Supabase Data Layer
 *
 * Hooks for apex_executive_summaries table.
 *
 * DEFENSIVE PROGRAMMING:
 * - Zero-division risk avoided locally in components
 * - Array mappings safeguarded with `(data ?? [])`
 */

import { supabase } from '@/shared/api/supabase';
import { useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ApexSummary {
 id: string;
 tenant_id: string;
 snapshot_date: string;
 grc_health_score: number;
 trend_direction: 'UP' | 'DOWN' | 'STABLE';
 active_critical_risks: number;
 open_incidents: number;
 compliance_ratio: number;
 executive_message: string | null;
 created_at: string;
}

// ---------------------------------------------------------------------------
// HOOK: Get Apex Summaries
// Returns history. Usually the first element is the latest status.
// ---------------------------------------------------------------------------
export function useApexSummaries(limit = 30) {
 return useQuery({
 queryKey: ['apex-summaries', limit],
 queryFn: async (): Promise<ApexSummary[]> => {
 const { data, error } = await supabase
 .from('apex_executive_summaries')
 .select('*')
 .order('snapshot_date', { ascending: false })
 .limit(limit);

 if (error) {
 console.error('useApexSummaries: query failed', error.message);
 return [];
 }
 return (data ?? []) as ApexSummary[];
 },
 refetchInterval: 60_000,
 staleTime: 30_000,
 });
}
