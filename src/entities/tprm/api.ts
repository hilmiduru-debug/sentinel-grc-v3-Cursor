/**
 * TPRM FSD API — Wave 23
 * entities/tprm/api.ts
 *
 * Aşırı Savunmacı Programlama (Extreme Defensive Programming):
 * - Optional chaining ?.
 * - Nullish coalescing ?? ve || []
 * - Tablo yoksa (42P01) graceful degradation
 */

import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Tipler ────────────────────────────────────────────────────────────────

export interface VendorRow {
 name: string;
 risk_tier: string;
 criticality_score: number;
 status: string;
}

export interface AssessmentRow {
 status: string;
 risk_score: number | null;
 vendor_id: string;
}

export interface VendorEcosystemData {
 vendors: VendorRow[];
 assessments: AssessmentRow[];
}

export interface TPRMVendor {
 id: string;
 name: string;
 category: string | null;
 risk_tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
 criticality_score: number;
 status: 'Active' | 'Inactive' | 'Under Review' | 'Terminated';
 contact_person: string | null;
 email: string | null;
 contract_start: string | null;
 contract_end: string | null;
 last_audit_date: string | null;
 country: string | null;
 data_access_level: 'None' | 'Limited' | 'Full';
 notes: string | null;
 created_at: string;
}

export interface TPRMVendorSummary extends TPRMVendor {
 total_assessments: number;
 completed_assessments: number;
 active_assessments: number;
 avg_risk_score: number;
 last_assessment_date: string | null;
}

export interface VendorAssessment {
 id: string;
 vendor_id: string;
 title: string;
 status: 'Draft' | 'Sent' | 'In Progress' | 'Completed' | 'Review Needed';
 risk_score: number | null;
 due_date: string | null;
 completed_at: string | null;
 assessor: string | null;
 created_at: string;
}

// ─── Legacy function (backward compat) ────────────────────────────────────

export async function fetchVendorEcosystemData(): Promise<VendorEcosystemData> {
 const [vRes, aRes] = await Promise.all([
 supabase.from('tprm_vendors').select('name, risk_tier, criticality_score, status'),
 supabase.from('tprm_assessments').select('status, risk_score, vendor_id'),
 ]);

 return {
 vendors: (vRes.data || []) as VendorRow[],
 assessments: (aRes.data || []) as AssessmentRow[],
 };
}

// ─── Hook: useVendors ──────────────────────────────────────────────────────

export function useVendors() {
 return useQuery<TPRMVendorSummary[]>({
 queryKey: ['tprm-vendors'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('tprm_vendor_summary')
 .select('*')
 .order('criticality_score', { ascending: false });

 if (error) {
 // Graceful degradation: tablo henüz migrate edilmemişse boş dizi
 if (error.code === '42P01') return [];
 throw error;
 }
 return (data ?? []) as TPRMVendorSummary[];
 },
 staleTime: 1000 * 60 * 5,
 });
}

// ─── Hook: useVendor ──────────────────────────────────────────────────────

export function useVendor(id?: string | null) {
 return useQuery<TPRMVendorSummary | null>({
 queryKey: ['tprm-vendor', id],
 enabled: !!id,
 queryFn: async () => {
 if (!id) return null;
 const { data, error } = await supabase
 .from('tprm_vendor_summary')
 .select('*')
 .eq('id', id)
 .maybeSingle();
 if (error) throw error;
 return (data ?? null) as TPRMVendorSummary | null;
 },
 });
}

// ─── Hook: useVendorAssessments ───────────────────────────────────────────

export function useVendorAssessments(vendorId?: string | null) {
 return useQuery<VendorAssessment[]>({
 queryKey: ['tprm-assessments', vendorId],
 enabled: !!vendorId,
 queryFn: async () => {
 if (!vendorId) return [];
 const { data, error } = await supabase
 .from('tprm_assessments')
 .select('*')
 .eq('vendor_id', vendorId)
 .order('created_at', { ascending: false });
 if (error) {
 if (error.code === '42P01') return [];
 throw error;
 }
 return (data ?? []) as VendorAssessment[];
 },
 staleTime: 1000 * 60 * 2,
 });
}

// ─── Mutation: useUpdateVendor ─────────────────────────────────────────────

export function useUpdateVendor() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async (
 input: { id: string } & Partial<Pick<TPRMVendor, 'status' | 'risk_tier' | 'criticality_score' | 'notes'>>
 ) => {
 const { id, ...updates } = input;
 const { data, error } = await supabase
 .from('tprm_vendors')
 .update({ ...updates, updated_at: new Date().toISOString() })
 .eq('id', id)
 .select()
 .single();
 if (error) throw error;
 return data;
 },
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['tprm-vendors'] });
 qc.invalidateQueries({ queryKey: ['tprm-vendor'] });
 },
 });
}

// ─── Mutation: useUpdateAssessmentStatus ─────────────────────────────────

export function useUpdateAssessmentStatus() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async (input: {
 id: string;
 vendor_id: string;
 risk_score?: number;
 status: string;
 }) => {
 const payload: Record<string, unknown> = {
 status: input.status,
 updated_at: new Date().toISOString(),
 };
 if (input.risk_score !== undefined) payload.risk_score = input.risk_score;

 const { data, error } = await supabase
 .from('tprm_assessments')
 .update(payload)
 .eq('id', input.id)
 .select()
 .single();
 if (error) throw error;
 return data;
 },
 onSuccess: (_, vars) => {
 qc.invalidateQueries({ queryKey: ['tprm-assessments', vars.vendor_id] });
 qc.invalidateQueries({ queryKey: ['tprm-vendors'] });
 },
 });
}
