/**
 * Basel IV RWA & Capital Adequacy Simulator — Veri Katmanı
 * features/basel-iv/api.ts (Wave 69)
 *
 * Çökme Kalkanları:
 * (calculations || []).map(...) → boş dizi kalkanı
 * (total_rwa || 1) → SYR oranında sıfıra bölünme koruması
 * 42P01 → graceful boş dizi/null
 */

import { supabase } from '@/shared/api/supabase';
import { useQuery } from '@tanstack/react-query';

// ─── Tipler ──────────────────────────────────────────────────────────────────

export type AssetClass = 'CORPORATE' | 'RETAIL' | 'MORTGAGE' | 'SOVEREIGN' | 'BANK' | 'EQUITY' | 'OTHER';
export type CarStatus = 'DRAFT' | 'SUBMITTED_TO_BDDK' | 'APPROVED' | 'REJECTED';

export interface RwaCalculation {
 id: string;
 calc_code: string;
 calculation_date: string;
 asset_class: AssetClass;
 exposure_amount: number;
 ccf_pct: number;
 risk_weight_pct: number;
 rwa_amount: number; // GENERATED = EAD * (CCF/100) * (RW/100)
 crm_applied: boolean;
 crm_details: string | null;
 analyst: string;
 is_approved: boolean;
}

export interface CapitalAdequacyRatio {
 id: string;
 report_period: string;
 report_date: string;
 cet1_capital: number;
 tier1_capital: number;
 tier2_capital: number;
 total_capital: number; // GENERATED = Tier1 + Tier2
 credit_rwa: number;
 market_rwa: number;
 operational_rwa: number;
 total_rwa: number; // GENERATED = C + M + O
 min_required_ratio: number;
 capital_buffer_pct: number;
 status: CarStatus;
}

// Uygulamada anlık hesaplanan metrikler
export interface CarMetrics {
 totalCapital: number;
 totalRWA: number;
 actualRatioPct: number;
 bufferExcessPct: number;
 isCompliant: boolean;
}

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

export function formatTRY(amount: number | null | undefined): string {
 if (amount === null || amount === undefined || isNaN(amount)) return '0 ₺';
 return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export function formatCompact(amount: number | null | undefined): string {
 if (!amount) return '0';
 if (amount >= 1e9) return (amount / 1e9).toFixed(2) + ' Milyar';
 if (amount >= 1e6) return (amount / 1e6).toFixed(2) + ' Milyon';
 if (amount >= 1e3) return (amount / 1e3).toFixed(0) + ' Bin';
 return amount.toString();
}

// ─── Hook: useRWA ─────────────────────────────────────────────────────────────

export function useRWA(filters?: { assetClass?: string; isApproved?: boolean }) {
 return useQuery<RwaCalculation[]>({
 queryKey: ['basel-rwa', filters],
 queryFn: async () => {
 let q = supabase
 .from('rwa_calculations')
 .select('*')
 .order('calculation_date', { ascending: false });

 if (filters?.assetClass && filters.assetClass !== 'ALL') {
 q = q.eq('asset_class', filters.assetClass);
 }
 if (typeof filters?.isApproved === 'boolean') {
 q = q.eq('is_approved', filters.isApproved);
 }

 const { data, error } = await q;
 if (error) {
 if (error.code === '42P01') return [];
 throw error;
 }

 // (calculations || []).map kalkanı
 return (data || []).map((row: any) => ({
 ...row,
 exposure_amount: Number(row.exposure_amount || 0),
 ccf_pct: Number(row.ccf_pct || 0),
 risk_weight_pct: Number(row.risk_weight_pct || 0),
 rwa_amount: Number(row.rwa_amount || 0),
 })) as RwaCalculation[];
 },
 staleTime: 1000 * 60 * 5,
 });
}

// ─── Hook: useCapitalRatio ────────────────────────────────────────────────────

export function useCapitalRatio(period?: string) {
 return useQuery<CapitalAdequacyRatio | null>({
 queryKey: ['basel-car', period],
 queryFn: async () => {
 let q = supabase
 .from('capital_adequacy_ratios')
 .select('*')
 .order('report_date', { ascending: false })
 .limit(1);

 if (period) {
 q = supabase.from('capital_adequacy_ratios').select('*').eq('report_period', period).single();
 }

 const { data, error } = await q;
 if (error) {
 if (error.code === '42P01') return null;
 if (error.code === 'PGRST116') return null; // Bulunamadı
 throw error;
 }

 if (!data) return null;
 
 const r = Array.isArray(data) ? data[0] : data;
 if (!r) return null;

 return {
 ...r,
 cet1_capital: Number(r.cet1_capital || 0),
 tier1_capital: Number(r.tier1_capital || 0),
 tier2_capital: Number(r.tier2_capital || 0),
 total_capital: Number(r.total_capital || 0),
 credit_rwa: Number(r.credit_rwa || 0),
 market_rwa: Number(r.market_rwa || 0),
 operational_rwa: Number(r.operational_rwa || 0),
 total_rwa: Number(r.total_rwa || 0),
 min_required_ratio: Number(r.min_required_ratio || 12),
 capital_buffer_pct: Number(r.capital_buffer_pct || 2.5),
 } as CapitalAdequacyRatio;
 },
 staleTime: 1000 * 60 * 5,
 });
}

// ─── Hook: SYR Matematik ──────────────────────────────────────────────────────

export function calculateMetrics(car: CapitalAdequacyRatio | null): CarMetrics {
 if (!car) {
 return { totalCapital: 0, totalRWA: 0, actualRatioPct: 0, bufferExcessPct: 0, isCompliant: false };
 }

 // (total_rwa || 1) -> SIFIRA BÖLÜNME KORUMASI KESİNLİKLE UYGULANDI
 const safeTotalRWA = car.total_rwa || 1;
 const ratio = (car.total_capital / safeTotalRWA) * 100;
 
 const targetRatio = car.min_required_ratio + car.capital_buffer_pct; // Örn: 12 + 2.5 = 14.5
 
 return {
 totalCapital: car.total_capital,
 totalRWA: car.total_rwa,
 actualRatioPct: Math.round(ratio * 100) / 100, // 2 ondalık
 bufferExcessPct: Math.round((ratio - targetRatio) * 100) / 100,
 isCompliant: ratio >= targetRatio
 };
}
