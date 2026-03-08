import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'false_positive';
export type EventCategory = 'normal' | 'suspicious' | 'critical';

export interface UserBehaviorLog {
 id: string;
 tenant_id: string;
 user_id: string;
 user_name: string | null;
 session_id: string | null;
 event_type: string;
 event_category: EventCategory;
 ip_address: string | null;
 resource_type: string | null;
 resource_id: string | null;
 metadata: Record<string, unknown> | null;
 risk_score: number;
 occurred_at: string;
 created_at: string;
}

export interface FraudAlert {
 id: string;
 tenant_id: string;
 alert_code: string;
 title: string;
 description: string | null;
 severity: AlertSeverity;
 status: AlertStatus;
 affected_user: string | null;
 affected_user_name: string | null;
 source_log_id: string | null;
 risk_score: number;
 evidence: Record<string, unknown> | null;
 resolved_by: string | null;
 resolved_at: string | null;
 created_at: string;
 updated_at: string;
}

// ─── Aggregated stats type (for BehaviorRadar) ────────────────────────────────

export interface FraudStats {
 totalEvents: number;
 suspiciousEvents: number;
 criticalEvents: number;
 suspiciousRate: number; // Wave 46: (suspicious / (totalEvents || 1)) * 100
 criticalRate: number; // Wave 46: (critical / (totalEvents || 1)) * 100
 avgRiskScore: number;
 topRiskyUser: string | null;
 openAlerts: number;
 criticalAlerts: number;
}

// ─── Behavior Logs ────────────────────────────────────────────────────────────

export function useBehaviorLogs(filters?: {
 userId?: string;
 category?: EventCategory;
 hoursBack?: number;
}) {
 return useQuery({
 queryKey: ['behavior-logs', TENANT_ID, filters],
 queryFn: async () => {
 let query = supabase
 .from('user_behavior_logs')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('occurred_at', { ascending: false })
 .limit(200);

 if (filters?.userId) query = query.eq('user_id', filters.userId);
 if (filters?.category) query = query.eq('event_category', filters.category);
 if (filters?.hoursBack) {
 const since = new Date(Date.now() - filters.hoursBack * 3600_000).toISOString();
 query = query.gte('occurred_at', since);
 }

 const { data, error } = await query;
 if (error) {
 console.error('[Wave 46] Davranış logları alınamadı:', error.message);
 return [] as UserBehaviorLog[];
 }
 return (data ?? []) as UserBehaviorLog[];
 },
 staleTime: 30_000,
 refetchInterval: 60_000,
 });
}

/** Aggregated fraud analytics stats for BehaviorRadar */
export function useFraudStats(hoursBack = 72) {
 return useQuery({
 queryKey: ['fraud-stats', TENANT_ID, hoursBack],
 queryFn: async () => {
 const since = new Date(Date.now() - hoursBack * 3600_000).toISOString();

 const { data: logs, error: logsErr } = await supabase
 .from('user_behavior_logs')
 .select('event_category, risk_score, user_id, user_name')
 .eq('tenant_id', TENANT_ID)
 .gte('occurred_at', since);

 if (logsErr) {
 console.error('[Wave 46] Stats logları alınamadı:', logsErr.message);
 return null;
 }

 const { data: alerts, error: alertsErr } = await supabase
 .from('fraud_alerts')
 .select('severity, status')
 .eq('tenant_id', TENANT_ID)
 .eq('status', 'open');

 if (alertsErr) {
 console.error('[Wave 46] Alert sayımı alınamadı:', alertsErr.message);
 }

 const allLogs = logs ?? [];
 const allAlerts = alerts ?? [];

 const totalEvents = allLogs.length;
 // Wave 46: (total_events || 1) — sıfıra bölünme koruması
 const divisor = totalEvents || 1;

 const suspiciousEvents = (allLogs || []).filter(l => l.event_category === 'suspicious').length;
 const criticalEvents = (allLogs || []).filter(l => l.event_category === 'critical').length;
 const suspiciousRate = (suspiciousEvents / divisor) * 100;
 const criticalRate = (criticalEvents / divisor) * 100;
 const avgRiskScore = totalEvents === 0
 ? 0
 : (allLogs || []).reduce((sum, l) => sum + (l.risk_score ?? 0), 0) / divisor;

 // Top risky user — max risk_score
 const topRiskyLog = allLogs.reduce<UserBehaviorLog | null>((max, l) => {
 if (!max || (l.risk_score ?? 0) > (max.risk_score ?? 0)) return l as UserBehaviorLog;
 return max;
 }, null);

 const stats: FraudStats = {
 totalEvents,
 suspiciousEvents,
 criticalEvents,
 suspiciousRate: Math.round(suspiciousRate * 10) / 10,
 criticalRate: Math.round(criticalRate * 10) / 10,
 avgRiskScore: Math.round(avgRiskScore * 10) / 10,
 topRiskyUser: topRiskyLog?.user_name ?? topRiskyLog?.user_id ?? null,
 openAlerts: allAlerts.length,
 criticalAlerts: (allAlerts || []).filter(a => a.severity === 'critical').length,
 };

 return stats;
 },
 staleTime: 30_000,
 });
}

// ─── Fraud Alerts ─────────────────────────────────────────────────────────────

export function useFraudAlerts(filters?: { status?: AlertStatus; severity?: AlertSeverity }) {
 return useQuery({
 queryKey: ['fraud-alerts', TENANT_ID, filters],
 queryFn: async () => {
 let query = supabase
 .from('fraud_alerts')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('risk_score', { ascending: false });

 if (filters?.status) query = query.eq('status', filters.status);
 if (filters?.severity) query = query.eq('severity', filters.severity);

 const { data, error } = await query;
 if (error) {
 console.error('[Wave 46] Fraud uyarıları alınamadı:', error.message);
 return [] as FraudAlert[];
 }
 return (data ?? []) as FraudAlert[];
 },
 staleTime: 30_000,
 refetchInterval: 60_000,
 });
}

export function useUpdateAlertStatus() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async ({
 id,
 status,
 resolvedBy,
 }: {
 id: string;
 status: AlertStatus;
 resolvedBy?: string;
 }) => {
 const { error } = await supabase
 .from('fraud_alerts')
 .update({
 status,
 ...(status === 'resolved' && resolvedBy ? {
 resolved_by: resolvedBy,
 resolved_at: new Date().toISOString(),
 } : {}),
 updated_at: new Date().toISOString(),
 })
 .eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['fraud-alerts'] });
 qc.invalidateQueries({ queryKey: ['fraud-stats'] });
 },
 onError: (err) => {
 console.error('[Wave 46] Uyarı durumu güncellenemedi:', (err as Error)?.message);
 },
 });
}
