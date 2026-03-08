/**
 * Wave 64: Data Privacy & PII Flow Mapper — Supabase Data Layer
 *
 * Hooks for pii_data_flows, consent_records, and privacy_breaches tables.
 *
 * DEFENSIVE PROGRAMMING:
 * - (total_records || 1) for division by zero
 * - (arrays ?? []).map()
 * - ?. field access
 */

import { supabase } from '@/shared/api/supabase';
import { useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PiiDataFlow {
 id: string;
 tenant_id: string;
 system_source: string;
 system_destination: string;
 data_categories: string[];
 transfer_method: string;
 is_encrypted: boolean;
 is_cross_border: boolean;
 legal_basis: string;
 risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
 last_review_at: string | null;
 created_at: string;
}

export interface ConsentRecord {
 id: string;
 context: string;
 total_users: number;
 consented_users: number;
 revoked_users: number;
 measured_at: string;
}

export interface PrivacyBreach {
 id: string;
 incident_title: string;
 description: string | null;
 affected_records: number;
 affected_data_types: string[];
 severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
 status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'REPORTED_TO_DPA' | 'CLOSED';
 detected_at: string;
 resolved_at: string | null;
}

// ---------------------------------------------------------------------------
// HOOK: Get PII Data Flows
// ---------------------------------------------------------------------------
export function useDataFlows() {
 return useQuery({
 queryKey: ['pii-data-flows'],
 queryFn: async (): Promise<PiiDataFlow[]> => {
 const { data, error } = await supabase
 .from('pii_data_flows')
 .select('*')
 .order('created_at', { ascending: false });

 if (error) {
 console.error('useDataFlows: query failed', error.message);
 return [];
 }
 return (data ?? []) as PiiDataFlow[];
 },
 staleTime: 60_000,
 });
}

// ---------------------------------------------------------------------------
// HOOK: Get Consent Records
// ---------------------------------------------------------------------------
export function useConsentRecords() {
 return useQuery({
 queryKey: ['privacy-consent-records'],
 queryFn: async (): Promise<ConsentRecord[]> => {
 const { data, error } = await supabase
 .from('consent_records')
 .select('*')
 .order('measured_at', { ascending: false });

 if (error) {
 console.error('useConsentRecords: query failed', error.message);
 return [];
 }
 return (data ?? []) as ConsentRecord[];
 },
 staleTime: 60_000,
 });
}

// ---------------------------------------------------------------------------
// HOOK: Get Privacy Breaches
// ---------------------------------------------------------------------------
export function usePrivacyBreaches() {
 return useQuery({
 queryKey: ['privacy-breaches'],
 queryFn: async (): Promise<PrivacyBreach[]> => {
 const { data, error } = await supabase
 .from('privacy_breaches')
 .select('*')
 .order('detected_at', { ascending: false });

 if (error) {
 console.error('usePrivacyBreaches: query failed', error.message);
 return [];
 }
 return (data ?? []) as PrivacyBreach[];
 },
 refetchInterval: 30_000, // Background checking for new breaches
 staleTime: 10_000,
 });
}
