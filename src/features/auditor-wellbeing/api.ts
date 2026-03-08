/**
 * Wave 74: Auditor Well-Being & Burnout Predictor — API
 * Tablolar: auditor_workload_logs, burnout_risk_scores
 * Matematiksel sıfıra bölünme koruması uygulanmıştır.
 */

import { supabase } from '@/shared/api/supabase';
import { useQuery } from '@tanstack/react-query';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

export type RiskStatusLabel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface WorkloadLog {
 id: string;
 auditor_id: string;
 auditor_name: string;
 period: string;
 total_projects: number;
 available_hours: number;
 logged_hours: number;
 travel_days: number;
 complexity_factor: number;
}

export interface BurnoutScore {
 id: string;
 auditor_id: string;
 auditor_name: string;
 department: string;
 risk_score: number;
 overtime_percentage: number;
 risk_status: RiskStatusLabel;
 ai_recommendation: string | null;
 last_calculated_at: string;
}

export interface WellBeingDashboardData {
 workloads: WorkloadLog[];
 scores: BurnoutScore[];
 globalBurnoutRisk: number; // 0-100 arası ortalama
 totalCriticalAuditors: number; // CRITICAL durumda olanlar
 averageOvertimePercentage: number; // Tüm havuzun ortalama fazla mesai oranı
}

export function useWellBeingDashboard() {
 return useQuery<WellBeingDashboardData>({
 queryKey: ['wellbeing-dashboard-data'],
 staleTime: 60_000,
 queryFn: async () => {
 // 1. İş yükü logları
 const { data: rawWorkloads, error: wErr } = await supabase
 .from('auditor_workload_logs')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('auditor_name', { ascending: true });

 if (wErr) {
 console.error('[WellBeing API] Workloads fetch error:', wErr);
 throw wErr;
 }

 // 2. Risk skorları
 const { data: rawScores, error: sErr } = await supabase
 .from('burnout_risk_scores')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('risk_score', { ascending: false }); // Yüksek risk üstte

 if (sErr) {
 console.error('[WellBeing API] Scores fetch error:', sErr);
 throw sErr;
 }

 const workloads = (rawWorkloads ?? []) as WorkloadLog[];
 const scores = (rawScores ?? []) as BurnoutScore[];

 // 3. Genel hesaplamalar (Sıfıra bölünme veya null dizilerine karşı %100 korumalı)
 let sumRisk = 0;
 let criticals = 0;
 let totalLogged = 0;
 let totalAvailable = 0;

 scores.forEach(s => {
 sumRisk += safeNum(s.risk_score);
 if (s.risk_status === 'CRITICAL' || s.risk_status === 'HIGH') {
 criticals++;
 }
 });

 workloads.forEach(w => {
 totalLogged += safeNum(w.logged_hours);
 totalAvailable += safeNum(w.available_hours);
 });

 // Matematik: total_scores_length > 0 ise sum/len, değilse 0. (Sıfıra bölünme yasağı)
 const globalBurnoutRisk = scores.length > 0 
 ? (sumRisk / (scores.length || 1)) 
 : 0;

 // Ortalama Fazla Mesai:
 // total_logged - total_available / total_available. (Sadece >0 ise)
 let averageOvertimePercentage = 0;
 const baseAvailable = totalAvailable || 1; // Division-by-zero koruması
 
 if (totalLogged > totalAvailable) {
 averageOvertimePercentage = ((totalLogged - totalAvailable) / baseAvailable) * 100;
 }

 return {
 workloads,
 scores,
 globalBurnoutRisk,
 totalCriticalAuditors: criticals,
 averageOvertimePercentage,
 };
 }
 });
}

// Yardımcı: Null/Undefined'i 0'a zorla
function safeNum(val: any): number {
 if (typeof val === 'number') return val;
 if (!val) return 0;
 return parseFloat(val) || 0;
}
