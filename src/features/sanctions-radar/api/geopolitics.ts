import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SanctionRiskLevel = 'critical' | 'high' | 'medium';
export type AmlSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AmlStatus = 'open' | 'investigating' | 'reported_to_fiu' | 'false_positive' | 'resolved';

export interface SanctionList {
 id: string;
 tenant_id: string;
 entity_name: string;
 entity_type: 'PERSON' | 'COMPANY' | 'VESSEL' | 'COUNTRY';
 country_code: string | null;
 list_source: string;
 sanction_type: string;
 risk_level: SanctionRiskLevel;
 matched_at: string | null;
 notes: string | null;
 is_active: boolean;
 created_at: string;
}

export interface AmlAlert {
 id: string;
 tenant_id: string;
 alert_code: string;
 title: string;
 description: string | null;
 alert_type: string;
 severity: AmlSeverity;
 status: AmlStatus;
 customer_id: string | null;
 customer_name: string | null;
 transaction_amount: number | null;
 transaction_currency: string | null;
 origin_country: string | null;
 destination_country: string | null;
 total_transactions: number;
 risk_score: number;
 evidence: Record<string, unknown> | null;
 created_at: string;
 updated_at: string;
}

export interface GeoEvent {
 id: string;
 tenant_id: string;
 title: string;
 description: string | null;
 region: string;
 country_code: string | null;
 coordinates: { lat: number; lng: number } | null;
 event_type: string;
 impact_level: 'critical' | 'high' | 'medium' | 'low';
 is_active: boolean;
 occurred_at: string | null;
 created_at: string;
}

/** Stats struct for GeoRadar Dashboard */
export interface GeoStats {
 activeSanctions: number;
 openAmlAlerts: number;
 criticalGeoEvents: number;
 riskyTransactionRate: number; // calculated with (total_transactions || 1)
}

// ─── Sanction Lists ───────────────────────────────────────────────────────────

export function useSanctions(filters?: { activeOnly?: boolean; risk?: SanctionRiskLevel }) {
 return useQuery({
 queryKey: ['sanction-lists', TENANT_ID, filters],
 queryFn: async () => {
 let query = supabase
 .from('sanction_lists')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('created_at', { ascending: false });

 if (filters?.activeOnly) query = query.eq('is_active', true);
 if (filters?.risk) query = query.eq('risk_level', filters.risk);

 const { data, error } = await query;
 if (error) {
 console.error('[Wave 62] Ambargo listesi alınamadı:', error.message);
 return [] as SanctionList[];
 }
 return (data ?? []) as SanctionList[];
 },
 staleTime: 30_000,
 });
}

// ─── AML Alerts ───────────────────────────────────────────────────────────────

export function useAmlAlerts(status?: AmlStatus) {
 return useQuery({
 queryKey: ['aml-alerts', TENANT_ID, status],
 queryFn: async () => {
 let query = supabase
 .from('aml_alerts')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('created_at', { ascending: false });

 if (status) query = query.eq('status', status);

 const { data, error } = await query;
 if (error) {
 console.error('[Wave 62] AML alarmları alınamadı:', error.message);
 return [] as AmlAlert[];
 }
 return (data ?? []) as AmlAlert[];
 },
 staleTime: 30_000,
 refetchInterval: 60_000,
 });
}

export function useUpdateAmlStatus() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async ({ id, status }: { id: string; status: AmlStatus }) => {
 const { error } = await supabase
 .from('aml_alerts')
 .update({ status, updated_at: new Date().toISOString() })
 .eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => qc.invalidateQueries({ queryKey: ['aml-alerts'] }),
 onError: (err) => console.error('[Wave 62] AML durumu güncellenemedi:', (err as Error)?.message),
 });
}

// ─── Geopolitical Events ──────────────────────────────────────────────────────

export function useGeoEvents(activeOnly = true) {
 return useQuery({
 queryKey: ['geo-events', TENANT_ID, activeOnly],
 queryFn: async () => {
 let query = supabase
 .from('geopolitical_events')
 .select('*')
 .eq('tenant_id', TENANT_ID)
 .order('occurred_at', { ascending: false });

 if (activeOnly) query = query.eq('is_active', true);

 const { data, error } = await query;
 if (error) {
 console.error('[Wave 62] Makro risk olayları alınamadı:', error.message);
 return [] as GeoEvent[];
 }
 return (data ?? []) as GeoEvent[];
 },
 staleTime: 60_000,
 });
}

// ─── Aggregated GeoStats ──────────────────────────────────────────────────────

export function useGeoStats() {
 return useQuery({
 queryKey: ['geo-stats', TENANT_ID],
 queryFn: async () => {
 const [sanctionRes, amlRes, geoRes] = await Promise.all([
 supabase.from('sanction_lists').select('id').eq('tenant_id', TENANT_ID).eq('is_active', true),
 supabase.from('aml_alerts').select('total_transactions, risk_score').eq('tenant_id', TENANT_ID),
 supabase.from('geopolitical_events').select('id').eq('tenant_id', TENANT_ID).eq('is_active', true).eq('impact_level', 'critical'),
 ]);

 const amlRows = amlRes.data ?? [];
 const totalTx = (amlRows || []).reduce((sum, r) => sum + (r.total_transactions ?? 0), 0);
 const riskyTx = (amlRows || []).filter(r => (r.risk_score ?? 0) >= 80).reduce((sum, r) => sum + (r.total_transactions ?? 0), 0);
 
 // Wave 62: (total_transactions || 1) sıfıra bölünme koruması
 const riskyTxRate = totalTx === 0 ? 0 : (riskyTx / (totalTx || 1)) * 100;

 return {
 activeSanctions: sanctionRes.data?.length ?? 0,
 openAmlAlerts: amlRows.length,
 criticalGeoEvents: geoRes.data?.length ?? 0,
 riskyTransactionRate: Math.round(riskyTxRate * 10) / 10,
 } as GeoStats;
 },
 staleTime: 45_000,
 });
}
