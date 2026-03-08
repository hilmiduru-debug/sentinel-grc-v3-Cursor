/**
 * Regulatory Export API — BDDK & Düzenleyici Kurum Dosyası
 * Wave 26: Yeni tablolardan (regulatory_dossiers, export_logs) ve
 * mevcut işlem zincirinden (actions + action_evidence) veri çeker.
 *
 * Mevcut `useDossierData` hook'u AYNEN KORUNMUŞTUR — sadece yeni hook'lar eklendi.
 */

import type { ActionEvidence, FindingSnapshot } from '@/entities/action/model/types';
import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ────────────────────────────────────────────────────────────────────────────
// Existing types (preserved)
// ────────────────────────────────────────────────────────────────────────────

export interface DossierData {
 dossierRef: string;
 generatedAt: string;
 tenantName: string;
 finding: FindingSnapshot & { entity?: string; control?: string };
 originalDueDate: string;
 actualClosureDate: string;
 isBddkBreach: boolean;
 boardExceptionRef?: string;
 evidence: ActionEvidence & { file_name: string };
 auditorName: string;
 auditorUid: string;
 reviewNote: string;
}

interface DbAction {
 id: string;
 finding_id: string;
 original_due_date: string;
 current_due_date: string;
 closed_at: string | null;
 status: string;
 finding_snapshot: FindingSnapshot & { entity?: string; control?: string };
 created_at: string;
}

interface DbEvidence {
 id: string;
 action_id: string;
 storage_path: string;
 file_hash: string;
 ai_confidence_score: number | null;
 review_note: string | null;
 uploaded_by: string | null;
 created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Wave 26: New types
// ────────────────────────────────────────────────────────────────────────────

export interface RegulatoryDossier {
 id: string;
 tenant_id: string | null;
 dossier_ref: string;
 title: string;
 type: 'BDDK' | 'SPK' | 'MASAK' | 'KVKK' | 'OTHER';
 status: 'DRAFT' | 'GENERATED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
 engagement_id: string | null;
 generated_by: string | null;
 package_path: string | null;
 notes: string;
 exported_at: string | null;
 created_at: string;
 updated_at: string;
}

export interface ExportLog {
 id: string;
 tenant_id: string | null;
 dossier_id: string | null;
 action: 'GENERATE' | 'SUBMIT' | 'DOWNLOAD' | 'REVOKE';
 status: 'SUCCESS' | 'FAILED' | 'PENDING';
 initiated_by: string | null;
 error_message: string | null;
 metadata: Record<string, unknown>;
 created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Query keys
// ────────────────────────────────────────────────────────────────────────────

const BDDK_DAYS = 365;
const QUERY_KEY = ['remediation-dossier'] as const;
const DOSSIERS_KEY = ['regulatory-dossiers'] as const;
const LOGS_KEY = ['export-logs'] as const;

// ────────────────────────────────────────────────────────────────────────────
// Existing functions (preserved)
// ────────────────────────────────────────────────────────────────────────────

function file_name_from_path(path: string): string {
 const parts = path?.split('/') ?? [];
 return parts[parts.length - 1] || path || 'evidence';
}

export async function fetchDossierData(actionId?: string | null): Promise<DossierData | null> {
 let query = supabase
 .from('actions')
 .select('id, finding_id, original_due_date, current_due_date, closed_at, status, finding_snapshot, created_at')
 .eq('status', 'closed');

 if (actionId) query = query.eq('id', actionId);

 const { data: actions, error: actError } = await query.order('closed_at', { ascending: false }).limit(1);

 if (actError || !actions?.length) return null;

 const action = actions[0] as DbAction;
 const snapshot = action?.finding_snapshot;
 if (!snapshot) return null;

 const { data: evidenceRows, error: evError } = await supabase
 .from('action_evidence')
 .select('*')
 .eq('action_id', action.id)
 .limit(1);

 if (evError || !evidenceRows?.length) return null;

 const ev = evidenceRows[0] as DbEvidence;
 const originalDue = action?.original_due_date || action?.current_due_date;
 const closedAt = action?.closed_at || action?.created_at;
 const closedDate = closedAt?.split('T')[0] ?? closedAt;
 const origDate = new Date(originalDue);
 const closeDate = new Date(closedDate);
 const daysOver = Math.round((closeDate.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24));
 const isBddkBreach = daysOver > BDDK_DAYS;

 const year = new Date().getFullYear();
 const refNum = String(action?.id ?? '').slice(0, 8).replace(/-/g, '').toUpperCase();
 const dossierRef = `SEN-DOSSIER-${year}-${refNum}`;

 // Wave 26 güçlendirme: tenant adını DB'den çek
 const { data: tenantData } = await supabase
 .from('tenants')
 .select('name')
 .limit(1)
 .maybeSingle();

 return {
 dossierRef,
 generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
 tenantName: tenantData?.name ?? 'Sentinel GRC v3.0',
 finding: {
 finding_id: snapshot?.finding_id ?? action?.finding_id,
 title: snapshot?.title ?? '',
 severity: snapshot?.severity ?? 'Medium',
 risk_rating: snapshot?.risk_rating ?? 'Medium',
 gias_category: snapshot?.gias_category,
 description: snapshot?.description,
 created_at: snapshot?.created_at ?? action?.created_at,
 entity: snapshot?.entity,
 control: snapshot?.control,
 },
 originalDueDate: originalDue,
 actualClosureDate: closedDate,
 isBddkBreach,
 boardExceptionRef: isBddkBreach ? `BOARD-EXC-${year}-${refNum.slice(0, 4)}` : undefined,
 evidence: {
 id: ev?.id,
 action_id: ev?.action_id,
 storage_path: ev?.storage_path,
 file_hash: ev?.file_hash ?? '',
 file_name: file_name_from_path(ev?.storage_path ?? ''),
 ai_confidence_score: ev?.ai_confidence_score ?? undefined,
 review_note: ev?.review_note ?? undefined,
 uploaded_by: ev?.uploaded_by ?? undefined,
 created_at: ev?.created_at,
 },
 auditorName: 'Denetçi — Sentinel v3.0',
 auditorUid: '—',
 reviewNote: ev?.review_note ?? 'Kanıt incelendi; iyileştirme tamamlandı.',
 };
}

export function useDossierData(actionId?: string | null) {
 return useQuery({
 queryKey: [...QUERY_KEY, actionId ?? 'latest'],
 queryFn: () => fetchDossierData(actionId),
 });
}

// ────────────────────────────────────────────────────────────────────────────
// Wave 26: New hooks — Regulatory Dossiers list + Export Log
// ────────────────────────────────────────────────────────────────────────────

/** Tüm regulatory_dossiers kayıtlarını listeler */
export function useDossiers(type?: RegulatoryDossier['type']) {
 return useQuery({
 queryKey: [...DOSSIERS_KEY, type ?? 'all'],
 queryFn: async () => {
 let query = supabase
 .from('regulatory_dossiers')
 .select('*')
 .order('created_at', { ascending: false });

 if (type) query = query.eq('type', type);

 const { data, error } = await query;
 if (error) {
 console.error('[Wave26] Failed to fetch regulatory_dossiers:', error);
 return [] as RegulatoryDossier[];
 }
 return (data ?? []) as RegulatoryDossier[];
 },
 });
}

/** Dossier oluşturur ve export_logs'a GENERATE logu yazar */
export function useGeneratePackage() {
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async (params: {
 title: string;
 type: RegulatoryDossier['type'];
 engagementId?: string | null;
 notes?: string;
 }) => {
 const year = new Date().getFullYear();
 const seq = Math.random().toString(36).slice(2, 8).toUpperCase();
 const dossierRef = `BDDK-${year}-${seq}`;

 // 1. Dossier oluştur
 const { data: dos, error: dosErr } = await supabase
 .from('regulatory_dossiers')
 .insert({
 dossier_ref: dossierRef,
 title: params?.title,
 type: params?.type ?? 'BDDK',
 status: 'GENERATED',
 engagement_id: params?.engagementId ?? null,
 notes: params?.notes ?? '',
 exported_at: new Date().toISOString(),
 })
 .select()
 .single();

 if (dosErr) throw dosErr;

 // 2. Export log yaz
 await supabase.from('export_logs').insert({
 dossier_id: dos?.id,
 action: 'GENERATE',
 status: 'SUCCESS',
 metadata: { title: params?.title, type: params?.type, ref: dossierRef },
 });

 return dos as RegulatoryDossier;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: DOSSIERS_KEY });
 queryClient.invalidateQueries({ queryKey: LOGS_KEY });
 },
 });
}

/** Son export loglarını listeler */
export function useExportLogs(dossierId?: string) {
 return useQuery({
 queryKey: [...LOGS_KEY, dossierId ?? 'all'],
 queryFn: async () => {
 let query = supabase
 .from('export_logs')
 .select('*')
 .order('created_at', { ascending: false })
 .limit(50);

 if (dossierId) query = query.eq('dossier_id', dossierId);

 const { data, error } = await query;
 if (error) {
 console.error('[Wave26] Failed to fetch export_logs:', error);
 return [] as ExportLog[];
 }
 return (data ?? []) as ExportLog[];
 },
 });
}
