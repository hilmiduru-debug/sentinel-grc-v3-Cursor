/**
 * Master Action Campaigns API — Otonom İyileştirme Kampanyaları
 *
 * DDL (mevcut migration: 20260219091340_20260225000000_create_action_management.sql):
 * master_action_campaigns(id, title, description, root_cause, status, created_at)
 * actions.campaign_id uuid REFERENCES master_action_campaigns(id)
 *
 * Wave 25 DDL (20260320000000_wave25_autonomous_remediation.sql):
 * auto_fix_logs(id, tenant_id, campaign_id, fix_type, target_system, status, ...)
 */

import type { MasterActionCampaign } from '@/entities/action/model/types';
import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CampaignRow {
 campaign: MasterActionCampaign;
 totalActions: number;
 closedActions: number;
}

export interface AutoFixLog {
 id: string;
 tenant_id: string;
 campaign_id: string | null;
 action_id: string | null;
 jit_token_id: string | null;
 fix_type: string;
 target_system: string;
 status: 'pending' | 'running' | 'success' | 'failed' | 'reverted';
 initiated_by: string;
 result_summary: string | null;
 error_message: string | null;
 duration_ms: number | null;
 started_at: string;
 completed_at: string | null;
 created_at: string;
}

export interface LaunchCampaignPayload {
 campaignId: string;
 tenantId: string;
 initiatedBy: string;
 fixType: string;
 targetSystem: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

const QUERY_KEYS = {
 campaigns: ['master-action-campaigns'] as const,
 autoFixLogs: (campaignId?: string) =>
 campaignId
 ? ['auto-fix-logs', campaignId]
 : ['auto-fix-logs'],
} as const;

// ─── Fetch Functions ──────────────────────────────────────────────────────────

async function fetchCampaigns(): Promise<CampaignRow[]> {
 const { data: campaigns, error: campError } = await supabase
 .from('master_action_campaigns')
 .select('*')
 .order('created_at', { ascending: false });

 if (campError) return [];
 if (!(campaigns ?? []).length) return [];

 const campaignIds = (campaigns ?? []).map((c) => c.id);

 const { data: actions, error: actionsError } = await supabase
 .from('actions')
 .select('id, campaign_id, status')
 .in('campaign_id', campaignIds);

 if (actionsError) {
 return (campaigns ?? []).map((c) => ({
 campaign: c as MasterActionCampaign,
 totalActions: 0,
 closedActions: 0,
 }));
 }

 const byCampaign: Record<string, { total: number; closed: number }> = {};
 for (const id of campaignIds) byCampaign[id] = { total: 0, closed: 0 };

 for (const a of (actions ?? [])) {
 const cid = a.campaign_id as string | null;
 if (!cid || !byCampaign[cid]) continue;
 byCampaign[cid].total += 1;
 if (a.status === 'closed' || a.status === 'evidence_submitted') {
 byCampaign[cid].closed += 1;
 }
 }

 return (campaigns ?? []).map((c) => ({
 campaign: c as MasterActionCampaign,
 totalActions: byCampaign[c.id]?.total ?? 0,
 closedActions: byCampaign[c.id]?.closed ?? 0,
 }));
}

async function fetchAutoFixLogs(campaignId?: string): Promise<AutoFixLog[]> {
 let query = supabase
 .from('auto_fix_logs')
 .select('*')
 .order('created_at', { ascending: false });

 if (campaignId) {
 query = query.eq('campaign_id', campaignId);
 }

 const { data, error } = await query;
 if (error) return [];
 return (data ?? []) as AutoFixLog[];
}

async function launchRemediationFix(payload: LaunchCampaignPayload): Promise<AutoFixLog> {
 const { data, error } = await supabase
 .from('auto_fix_logs')
 .insert({
 tenant_id: payload.tenantId,
 campaign_id: payload.campaignId,
 fix_type: payload.fixType ?? 'custom',
 target_system: payload.targetSystem,
 status: 'running',
 initiated_by: payload.initiatedBy,
 started_at: new Date().toISOString(),
 })
 .select()
 .single();

 if (error) throw error;
 return data as AutoFixLog;
}

async function markCampaignActionsSubmitted(campaignId: string): Promise<void> {
 const { error } = await supabase
 .from('actions')
 .update({ status: 'evidence_submitted' })
 .eq('campaign_id', campaignId)
 .neq('status', 'closed');

 if (error) throw error;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useCampaigns() {
 return useQuery({
 queryKey: QUERY_KEYS.campaigns,
 queryFn: fetchCampaigns,
 });
}

export function useAutoFixLogs(campaignId?: string) {
 return useQuery({
 queryKey: QUERY_KEYS.autoFixLogs(campaignId),
 queryFn: () => fetchAutoFixLogs(campaignId),
 refetchInterval: 10_000, // poll every 10s for running logs
 });
}

/**
 * Optimistic update'li kampanya başlatma hook'u.
 * Supabase'e yazılmadan ÖNCE UI'yi anında günceller.
 * Hata durumunda orijinal state'e geri döner.
 */
export function useLaunchCampaign() {
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async (payload: LaunchCampaignPayload) => {
 // Adım 1: auto_fix_logs'a kayıt ekle
 const logEntry = await launchRemediationFix(payload);
 // Adım 2: İlgili aksiyonları güncelle
 await markCampaignActionsSubmitted(payload.campaignId);
 return logEntry;
 },

 // Optimistic update: mutation henüz Supabase'e gitmeden UI güncelle
 onMutate: async (payload) => {
 await queryClient.cancelQueries({ queryKey: QUERY_KEYS.campaigns });

 const previousData = queryClient.getQueryData<CampaignRow[]>(QUERY_KEYS.campaigns);

 queryClient.setQueryData<CampaignRow[]>(QUERY_KEYS.campaigns, (old = []) =>
 (old ?? []).map((row) => {
 if (row.campaign.id !== payload.campaignId) return row;
 return {
 ...row,
 closedActions: row.totalActions, // optimistically mark all closed
 };
 })
 );

 return { previousData };
 },

 // Rollback on error
 onError: (_err, _variables, context) => {
 if (context?.previousData) {
 queryClient.setQueryData(QUERY_KEYS.campaigns, context.previousData);
 }
 },

 // Always refetch after settled
 onSettled: () => {
 queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns });
 queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autoFixLogs() });
 },
 });
}
