/**
 * Enterprise Digital Twin & Process Mining — Veri Katmanı
 * features/process-mining/api.ts (Wave 66)
 *
 * Çökme Kalkanları:
 * (logs || []).map(...) → boş dizi kalkanı
 * (actual_duration_hrs || 1) → sıfıra bölünme koruması
 * 42P01 → graceful boş fallback
 */

import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ─── Tipler ──────────────────────────────────────────────────────────────────

export type ComplianceStatus = 'COMPLIANT' | 'MINOR_DEVIATION' | 'BYPASS_DETECTED' | 'BOTTLENECK';

export interface ProcessNode {
 id: string;
 type: string;
 position: { x: number; y: number };
 data: {
 label: string;
 metadata?: Record<string, any>;
 };
}

export interface ProcessEdge {
 id: string;
 source: string;
 target: string;
 animated?: boolean;
 data?: {
 expected_time?: string;
 };
}

export interface DigitalTwinModel {
 id: string;
 process_code: string;
 name: string;
 department: string;
 owner: string;
 nodes_json: ProcessNode[];
 edges_json: ProcessEdge[];
 ideal_steps: number;
 ideal_duration_hours: number | null;
 is_active: boolean;
 created_at: string;
}

export interface ProcessMiningLog {
 id: string;
 model_id: string;
 case_id: string;
 start_time: string;
 end_time: string | null;
 actual_steps: number;
 actual_duration_hrs: number | null;
 compliance_status: ComplianceStatus;
 bypass_details: string | null;
 bottleneck_node_id: string | null;
 risk_score: number;
 handled_by: string | null;
 is_audited: boolean;
 created_at: string;
}

export interface ProcessKPI {
 totalCases: number;
 avgDurationHrs: number;
 complianceRatio: number;
 bypassCount: number;
 bottleneckCount: number;
}

// ─── Hook: useDigitalTwins ───────────────────────────────────────────────────

export function useDigitalTwins() {
 return useQuery<DigitalTwinModel[]>({
 queryKey: ['digital-twins'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('digital_twin_models')
 .select('*')
 .order('created_at', { ascending: false });

 if (error) {
 if (error.code === '42P01') return [];
 throw error;
 }

 // Güvenli parsing (nodes/edges || [])
 return (data || []).map((m: any) => ({
 ...m,
 nodes_json: Array.isArray(m.nodes_json) ? m.nodes_json : [],
 edges_json: Array.isArray(m.edges_json) ? m.edges_json : [],
 ideal_steps: Number(m.ideal_steps || 0),
 ideal_duration_hours: m.ideal_duration_hours ? Number(m.ideal_duration_hours) : null,
 })) as DigitalTwinModel[];
 },
 staleTime: 1000 * 60 * 10, // Modeller nadir değişir
 });
}

// ─── Hook: useProcessLogs ────────────────────────────────────────────────────

export function useProcessLogs(modelId?: string | null) {
 return useQuery<ProcessMiningLog[]>({
 queryKey: ['process-logs', modelId],
 enabled: !!modelId,
 queryFn: async () => {
 const { data, error } = await supabase
 .from('process_mining_logs')
 .select('*')
 .eq('model_id', modelId)
 .order('start_time', { ascending: false });

 if (error) {
 if (error.code === '42P01') return [];
 throw error;
 }

 return (data || []).map((log: any) => ({
 ...log,
 actual_steps: Number(log.actual_steps || 0),
 actual_duration_hrs: log.actual_duration_hrs ? Number(log.actual_duration_hrs) : null,
 risk_score: Number(log.risk_score || 0),
 })) as ProcessMiningLog[];
 },
 staleTime: 1000 * 60 * 2,
 });
}

// ─── Hook: useProcessKPI ──────────────────────────────────────────────────────

export function useProcessKPI(modelId?: string | null, logs?: ProcessMiningLog[]) {
 return useQuery<ProcessKPI>({
 queryKey: ['process-kpi', modelId],
 enabled: !!modelId && !!logs,
 queryFn: async () => {
 const safeLogs = logs || [];
 const totalCases = safeLogs.length;

 let sumDuration = 0;
 let durationCount = 0;
 let compliantCount = 0;
 let bypassCount = 0;
 let bottleneckCount = 0;

 for (const log of safeLogs) {
 if (log.actual_duration_hrs) {
 sumDuration += log.actual_duration_hrs;
 durationCount++;
 }
 if (log.compliance_status === 'COMPLIANT' || log.compliance_status === 'MINOR_DEVIATION') {
 compliantCount++;
 }
 if (log.compliance_status === 'BYPASS_DETECTED') {
 bypassCount++;
 }
 if (log.compliance_status === 'BOTTLENECK') {
 bottleneckCount++;
 }
 }

 // Sıfıra bölünme koruması KESİNLİKLE EKLENDİ
 const avgDurationHrs = Math.round((sumDuration / (durationCount || 1)) * 10) / 10;
 const complianceRatio = Math.round((compliantCount / (totalCases || 1)) * 100);

 return {
 totalCases,
 avgDurationHrs,
 complianceRatio,
 bypassCount,
 bottleneckCount,
 };
 },
 staleTime: 1000 * 60,
 });
}

// ─── Hook: useAuditCase ───────────────────────────────────────────────────────

export function useAuditCase() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async ({ id }: { id: string }) => {
 const { error } = await supabase
 .from('process_mining_logs')
 .update({ is_audited: true, risk_score: 100 }) // Denetlendiğinde risk maksimize ediliyor (raporlama için)
 .eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => {
 void qc.invalidateQueries({ queryKey: ['process-logs'] });
 toast.success('Süreç vakası Denetim Kapsamına (Audited) alındı.');
 },
 onError: (err: Error) => toast.error(`Denetim kaydı başarısız: ${err.message}`),
 });
}
