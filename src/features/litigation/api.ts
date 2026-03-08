/**
 * Litigation & Penalty Prediction Engine API
 * Wave 75: Dava ve Ceza Tahmin Motoru
 *
 * FSD: features/litigation/api.ts
 * Savunmacı Programlama: (cases || []).map ve strict optional chaining (?.)
 */

import { supabase } from '@/shared/api/supabase';
import { useQuery } from '@tanstack/react-query';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CaseStatus = 'Açık' | 'Derhal Çözüldü' | 'Karara Bağlandı' | 'Temyiz (İstinaf)' | 'Kapalı';
export type InvestigationStatus = 'Ön İnceleme' | 'İncelemede' | 'Savunma Aşamasında' | 'Karara Bağlandı' | 'İptal Edildi';
export type ReferenceType = 'CASE' | 'INVESTIGATION';

export interface LegalCase {
 id: string;
 tenant_id: string;
 case_number: string;
 plaintiff: string;
 defendant: string;
 court: string;
 case_type: string;
 filing_date: string;
 claimed_amount: number | null;
 status: CaseStatus;
 created_at: string;
 updated_at: string;
}

export interface RegulatoryInvestigation {
 id: string;
 tenant_id: string;
 regulator: string;
 subject: string;
 investigation_date: string;
 investigator_lead: string | null;
 status: InvestigationStatus;
 created_at: string;
 updated_at: string;
}

export interface PredictedPenalty {
 id: string;
 tenant_id: string;
 reference_type: ReferenceType;
 reference_id: string;
 predicted_loss_prob: number | null;
 predicted_penalty_amount: number | null;
 ai_confidence: number | null;
 risk_factors: string[] | null;
 mitigation_strategy: string | null;
 created_at: string;
 updated_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const LEGAL_CASES_KEY = ['legal-cases', TENANT_ID] as const;
const INVESTIGATIONS_KEY = ['regulatory-investigations', TENANT_ID] as const;
const PENALTIES_KEY = ['predicted-penalties', TENANT_ID] as const;

// ─── API Hooks ────────────────────────────────────────────────────────────────

export function useLegalCases() {
 return useQuery({
 queryKey: LEGAL_CASES_KEY,
 queryFn: async () => {
 const { data, error } = await supabase
 .from('legal_cases')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('created_at', { ascending: false });

 if (error) {
 console.error('[Wave75] Failed to fetch legal_cases:', error);
 return [] as LegalCase[];
 }
 
 return ((data as any[]) || []).map(item => ({
 ...item,
 claimed_amount: item?.claimed_amount ?? 0,
 })) as LegalCase[];
 },
 staleTime: 30_000,
 });
}

export function useInvestigations() {
 return useQuery({
 queryKey: INVESTIGATIONS_KEY,
 queryFn: async () => {
 const { data, error } = await supabase
 .from('regulatory_investigations')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('created_at', { ascending: false });

 if (error) {
 console.error('[Wave75] Failed to fetch regulatory_investigations:', error);
 return [] as RegulatoryInvestigation[];
 }
 
 return ((data as any[]) || []) as RegulatoryInvestigation[];
 },
 staleTime: 30_000,
 });
}

export function usePenalties(referenceId?: string) {
 return useQuery({
 queryKey: [...PENALTIES_KEY, referenceId],
 enabled: !!referenceId,
 queryFn: async () => {
 const { data, error } = await supabase
 .from('predicted_penalties')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .eq('reference_id', referenceId!)
 .order('created_at', { ascending: false });

 if (error) {
 console.error('[Wave75] Failed to fetch predicted_penalties:', error);
 return [] as PredictedPenalty[];
 }
 
 return ((data as any[]) || []).map(p => ({
 ...p,
 predicted_loss_prob: p?.predicted_loss_prob ?? 0,
 predicted_penalty_amount: p?.predicted_penalty_amount ?? 0,
 ai_confidence: p?.ai_confidence ?? 0,
 risk_factors: p?.risk_factors ?? [],
 })) as PredictedPenalty[];
 },
 staleTime: 15_000,
 });
}
