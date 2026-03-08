/**
 * Wave 48: BCP & Crisis Management Cockpit — Supabase Data Layer
 *
 * TanStack React Query hooks for crisis_events, bcp_scenarios, recovery_logs.
 *
 * DEFENSIVE PROGRAMMING (CONSTITUTIONALLY REQUIRED):
 * - (data ?? []) on all arrays
 * - ?.field on all nested access
 * - (elapsed_time || 1) on ALL RTO/RPO calculations — division-by-zero BANNED
 * - console.error on all query failures (no silent swallowing)
 */

import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface BcpScenario {
 id: string;
 tenant_id: string;
 scenario_code: string;
 title: string;
 category: 'IT' | 'NATURAL_DISASTER' | 'CYBER' | 'OPERATIONAL' | 'PANDEMIC' | 'SUPPLY_CHAIN';
 severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
 rto_minutes: number;
 rpo_minutes: number;
 description: string | null;
 steps: Array<{ id: number; title: string; description: string; owner: string }>;
 owner: string;
 is_tested: boolean;
 last_test_date: string | null;
 test_result: 'PASSED' | 'FAILED' | 'PARTIAL' | null;
 created_at: string;
}

export interface CrisisEvent {
 id: string;
 tenant_id: string;
 scenario_id: string | null;
 event_code: string;
 title: string;
 description: string | null;
 severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
 status: 'ACTIVE' | 'CONTAINED' | 'RECOVERING' | 'RESOLVED' | 'POST_MORTEM';
 activated_at: string;
 resolved_at: string | null;
 rto_target_at: string;
 rpo_target_at: string;
 affected_systems: string[];
 crisis_owner: string;
 escalated_to_cae: boolean;
 created_at: string;
}

export interface RecoveryLog {
 id: string;
 tenant_id: string;
 crisis_id: string;
 step_number: number;
 action_title: string;
 action_detail: string | null;
 status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
 assigned_to: string;
 started_at: string | null;
 completed_at: string | null;
 elapsed_minutes: number | null;
 notes: string | null;
 created_at: string;
}

// ---------------------------------------------------------------------------
// RTO Progress Calculator (ZERO DIVISION PROTECTION)
// ---------------------------------------------------------------------------
export function calcRtoProgress(event: CrisisEvent): {
 elapsedMs: number;
 targetMs: number;
 progressPct: number;
 isBreached: boolean;
 remainingSec: number;
} {
 const now = Date.now();
 const activatedMs = new Date(event.activated_at ?? now).getTime();
 const targetMs = new Date(event.rto_target_at ?? now).getTime();

 const elapsedMs = Math.max(0, now - activatedMs);
 const totalMs = Math.max(targetMs - activatedMs, 1); // (|| 1) — ZERO DIV GUARD
 const progressPct = Math.min(100, (elapsedMs / totalMs) * 100);
 const remainingSec = Math.max(0, Math.floor((targetMs - now) / 1000));

 return {
 elapsedMs,
 targetMs: totalMs,
 progressPct,
 isBreached: now > targetMs,
 remainingSec,
 };
}

// ---------------------------------------------------------------------------
// HOOK: All BCP Scenarios
// ---------------------------------------------------------------------------
export function useBcpScenarios() {
 return useQuery({
 queryKey: ['bcp-scenarios'],
 queryFn: async (): Promise<BcpScenario[]> => {
 const { data, error } = await supabase
 .from('bcp_scenarios')
 .select('*')
 .order('severity', { ascending: true })
 .order('rto_minutes', { ascending: true });
 if (error) {
 console.error('useBcpScenarios: query failed', error.message);
 return [];
 }
 return (data ?? []) as BcpScenario[];
 },
 staleTime: 120_000,
 });
}

// ---------------------------------------------------------------------------
// HOOK: Active crisis events (status = ACTIVE | RECOVERING | CONTAINED)
// ---------------------------------------------------------------------------
export function useActiveCrisis() {
 return useQuery({
 queryKey: ['crisis-events', 'active'],
 queryFn: async (): Promise<CrisisEvent[]> => {
 const { data, error } = await supabase
 .from('crisis_events')
 .select('*')
 .in('status', ['ACTIVE', 'RECOVERING', 'CONTAINED'])
 .order('severity', { ascending: true })
 .order('activated_at', { ascending: true });
 if (error) {
 console.error('useActiveCrisis: query failed', error.message);
 return [];
 }
 return (data ?? []) as CrisisEvent[];
 },
 refetchInterval: 10_000, // poll every 10s — live cockpit
 staleTime: 5_000,
 });
}

// ---------------------------------------------------------------------------
// HOOK: All crisis events (history)
// ---------------------------------------------------------------------------
export function useCrisisHistory() {
 return useQuery({
 queryKey: ['crisis-events', 'history'],
 queryFn: async (): Promise<CrisisEvent[]> => {
 const { data, error } = await supabase
 .from('crisis_events')
 .select('*')
 .order('activated_at', { ascending: false })
 .limit(50);
 if (error) {
 console.error('useCrisisHistory: query failed', error.message);
 return [];
 }
 return (data ?? []) as CrisisEvent[];
 },
 staleTime: 60_000,
 });
}

// ---------------------------------------------------------------------------
// HOOK: Recovery logs for a specific crisis
// ---------------------------------------------------------------------------
export function useRecoveryLogs(crisisId: string | null) {
 return useQuery({
 queryKey: ['recovery-logs', crisisId],
 enabled: !!crisisId,
 queryFn: async (): Promise<RecoveryLog[]> => {
 if (!crisisId) return [];
 const { data, error } = await supabase
 .from('recovery_logs')
 .select('*')
 .eq('crisis_id', crisisId)
 .order('step_number', { ascending: true });
 if (error) {
 console.error('useRecoveryLogs: query failed', error.message);
 return [];
 }
 return (data ?? []) as RecoveryLog[];
 },
 refetchInterval: 15_000,
 staleTime: 5_000,
 });
}

// ---------------------------------------------------------------------------
// MUTATION: Activate a new crisis event
// ---------------------------------------------------------------------------
export function useActivateCrisis() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async (payload: {
 title: string;
 description: string;
 severity: CrisisEvent['severity'];
 scenario_id?: string;
 affected_systems: string[];
 crisis_owner: string;
 rto_minutes: number;
 rpo_minutes: number;
 }) => {
 const now = new Date();
 const rtoTarget = new Date(now.getTime() + (payload.rto_minutes || 60) * 60_000);
 const rpoTarget = new Date(now.getTime() + (payload.rpo_minutes || 15) * 60_000);
 const eventCode = `CRISIS-${now.toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

 const { data, error } = await supabase
 .from('crisis_events')
 .insert({
 event_code: eventCode,
 title: payload.title,
 description: payload.description,
 severity: payload.severity,
 scenario_id: payload.scenario_id ?? null,
 affected_systems: payload.affected_systems ?? [],
 crisis_owner: payload.crisis_owner,
 rto_target_at: rtoTarget.toISOString(),
 rpo_target_at: rpoTarget.toISOString(),
 status: 'ACTIVE',
 escalated_to_cae: payload.severity === 'CRITICAL',
 })
 .select()
 .single();
 if (error) throw error;
 return data as CrisisEvent;
 },
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['crisis-events'] });
 },
 });
}

// ---------------------------------------------------------------------------
// MUTATION: Update crisis status
// ---------------------------------------------------------------------------
export function useUpdateCrisisStatus() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async (payload: {
 crisisId: string;
 status: CrisisEvent['status'];
 }) => {
 const update: Partial<CrisisEvent> & { resolved_at?: string } = {
 status: payload.status,
 };
 if (payload.status === 'RESOLVED') {
 update.resolved_at = new Date().toISOString();
 }
 const { data, error } = await supabase
 .from('crisis_events')
 .update(update)
 .eq('id', payload.crisisId)
 .select()
 .single();
 if (error) throw error;
 return data as CrisisEvent;
 },
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['crisis-events'] });
 },
 });
}

// ---------------------------------------------------------------------------
// MUTATION: Update recovery log step status
// ---------------------------------------------------------------------------
export function useUpdateRecoveryStep() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async (payload: {
 logId: string;
 crisisId: string;
 status: RecoveryLog['status'];
 notes?: string;
 }) => {
 const update: Record<string, unknown> = { status: payload.status };
 if (payload.status === 'IN_PROGRESS') update.started_at = new Date().toISOString();
 if (payload.status === 'COMPLETED' || payload.status === 'FAILED') {
 update.completed_at = new Date().toISOString();
 }
 if (payload.notes) update.notes = payload.notes;

 const { data, error } = await supabase
 .from('recovery_logs')
 .update(update)
 .eq('id', payload.logId)
 .select()
 .single();
 if (error) throw error;
 return data as RecoveryLog;
 },
 onSuccess: (_, vars) => {
 qc.invalidateQueries({ queryKey: ['recovery-logs', vars.crisisId] });
 },
 });
}
