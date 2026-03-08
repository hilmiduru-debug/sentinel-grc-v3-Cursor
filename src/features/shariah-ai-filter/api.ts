/**
 * Wave 90: Shariah-AI Algorithmic Filter & Shield — API
 * Tablolar: ai_investment_decisions, shariah_blocked_transactions
 */

import { supabase } from '@/shared/api/supabase';
import { useQuery } from '@tanstack/react-query';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

export type DecisionStatus = 'PENDING_REVIEW' | 'APPROVED' | 'BLOCKED_BY_SHIELD' | 'EXECUTED';
export type ActionType = 'BUY' | 'SELL' | 'HOLD';

export interface AIDecision {
 id: string;
 portfolio_id: string;
 ai_model_name: string;
 ticker: string;
 company_name: string;
 sector: string;
 action_type: ActionType;
 confidence_score: number;
 proposed_amount: number;
 status: DecisionStatus;
 decision_date: string;
}

export interface BlockedTransaction {
 id: string;
 decision_id: string;
 violating_ticker: string;
 company_name: string;
 violation_category: string;
 aaoifi_rule_ref: string;
 haram_income_ratio: number | null;
 debt_to_asset_ratio: number | null;
 block_reason: string;
 blocked_at: string;
}

export interface ShariahShieldData {
 decisions: AIDecision[];
 blockedTxs: BlockedTransaction[];
 totalBlocked: number;
 totalProposedValue: number;
 blockedValue: number;
}

export function useShariahShieldDashboard() {
 return useQuery<ShariahShieldData>({
 queryKey: ['shariah-shield-data'],
 staleTime: 60_000,
 queryFn: async () => {
 const { data: rawDecisions, error: dErr } = await supabase
 .from('ai_investment_decisions')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('decision_date', { ascending: false });

 if (dErr) {
 console.error('[Shariah-AI API] Error fetching decisions:', dErr);
 throw dErr;
 }

 const { data: rawBlocked, error: bErr } = await supabase
 .from('shariah_blocked_transactions')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('blocked_at', { ascending: false });

 if (bErr) {
 console.error('[Shariah-AI API] Error fetching blocked transactions:', bErr);
 throw bErr;
 }

 const decisions = (rawDecisions ?? []) as AIDecision[];
 const blockedTxs = (rawBlocked ?? []) as BlockedTransaction[];

 const totalBlocked = blockedTxs.length;
 let totalProposedValue = 0;
 let blockedValue = 0;

 decisions.forEach(d => {
 const val = Number(d.proposed_amount) || 0;
 totalProposedValue += val;
 if (d.status === 'BLOCKED_BY_SHIELD') {
 blockedValue += val;
 }
 });

 return {
 decisions,
 blockedTxs,
 totalBlocked,
 totalProposedValue,
 blockedValue
 };
 }
 });
}
