import { supabase } from '@/shared/api/supabase';
import { useQuery } from '@tanstack/react-query';
import { buildHierarchyFromLTree } from '../lib/ltree-parser';
import type { AuditEntity, UniverseNode } from '../model/types';

const KEYS = {
 universe: ['audit-universe-hierarchy'] as const,
 subtree: (path: string) => ['audit-universe-subtree', path] as const,
 entityRisk: (id: string) => ['audit-entity-risk-summary', id] as const,
 search: (q: string) => ['audit-universe-search', q] as const,
 impact: (id: string) => ['entity-impact-analysis', id] as const,
};

// ─── Tür Tanımları ────────────────────────────────────────────────────────────

export interface EntityImpactAnalysis {
 entity_id: string;
 entity_path: string;
 descendant_count: number;
 rkm_risk_count: number;
 open_finding_count: number;
}

/** Entity bazlı risk bileşenleri ve audit özeti */
export interface EntityRiskSummary {
 id: string;
 name: string;
 type: string;
 inherent_risk: number;
 residual_risk: number;
 risk_operational: number;
 risk_it: number;
 risk_compliance: number;
 risk_financial: number;
 risk_velocity: number;
 last_audit_date: string | null;
 next_audit_due: string | null;
 audit_frequency: string | null;
 open_finding_count: number;
 descendant_count: number;
}

// ─── Temel Evren Hiyerarşisi (Tam Ağaç) ──────────────────────────────────────

export async function fetchAuditUniverse(): Promise<UniverseNode[]> {
 const { data, error } = await supabase
 .from('audit_universe')
 .select(`
 id, name, path, type,
 inherent_risk, residual_risk, risk_velocity,
 risk_operational, risk_it, risk_compliance, risk_financial,
 owner_id, tenant_id, status,
 last_audit_date, next_audit_due, audit_frequency,
 metadata
 `)
 .order('path');
 if (error) throw error;
 return (data ?? []) as UniverseNode[];
}

export function useAuditUniverse() {
 return useQuery({
 queryKey: KEYS.universe,
 queryFn: async () => {
 const flat = await fetchAuditUniverse();
 return buildHierarchyFromLTree(flat);
 },
 });
}

// ─── ltree: Alt Ağaç (Subtree) Sorgusu ───────────────────────────────────────
// Kullanım: useUniverseSubtree('root.bank_a') → path LIKE 'root.bank_a%'
// PostgreSQL ltree operatörü: ltree_path <@ 'root.bank_a'
// Supabase filter ile simüle edilir (ltree ops native PostgREST desteklenmez)

export async function fetchUniverseSubtree(parentPath: string): Promise<AuditEntity[]> {
 // ltree <@ operatörünü simüle: path text LIKE 'parentPath%'
 const { data, error } = await supabase
 .from('audit_entities')
 .select('*')
 .or(`path.eq.${parentPath},path.like.${parentPath}.%`)
 .order('path');
 if (error) throw error;
 return (data ?? []) as AuditEntity[];
}

export function useUniverseSubtree(parentPath: string | null) {
 return useQuery({
 queryKey: KEYS.subtree(parentPath ?? ''),
 enabled: !!parentPath,
 queryFn: () => fetchUniverseSubtree(parentPath!),
 staleTime: 30_000, // 30 saniye cache — ağaç sık değişmez
 });
}

// ─── Entity Risk Özeti (Detay Drawer için) ────────────────────────────────────

export async function fetchEntityRiskSummary(entityId: string): Promise<EntityRiskSummary> {
 // 1. Varlık bilgilerini çek
 const { data: entity, error: eErr } = await supabase
 .from('audit_universe')
 .select(`
 id, name, type,
 inherent_risk, residual_risk, risk_velocity,
 risk_operational, risk_it, risk_compliance, risk_financial,
 last_audit_date, next_audit_due, audit_frequency
 `)
 .eq('id', entityId)
 .maybeSingle();
 if (eErr) throw eErr;
 if (!entity) throw new Error(`Entity ${entityId} bulunamadı`);

 // 2. Açık bulgu sayısını çek (engagement üzerinden)
 const { count: findingCount, error: fErr } = await supabase
 .from('audit_findings')
 .select('id', { count: 'exact', head: true })
 .in('state', ['DRAFT', 'REVIEW', 'PUBLISHED', 'NEGOTIATION'])
 .eq('audit_engagements.entity_id', entityId);

 // 3. Alt birim sayısını çek
 const { count: descendantCount, error: dErr } = await supabase
 .from('audit_entities')
 .select('id', { count: 'exact', head: true })
 .like('path', `${(entity as any).path ?? ''}.%`);

 // Savunmacı: Hatalar loglanır ama summary durdurulmaz
 if (fErr) console.error('[SENTINEL] Finding count fetch error:', fErr);
 if (dErr) console.error('[SENTINEL] Descendant count fetch error:', dErr);

 return {
 id: entity.id,
 name: entity.name ?? 'İsimsiz',
 type: entity.type ?? 'UNIT',
 inherent_risk: entity.inherent_risk ?? 0,
 residual_risk: entity.residual_risk ?? 0,
 risk_operational: entity.risk_operational ?? 0,
 risk_it: entity.risk_it ?? 0,
 risk_compliance: entity.risk_compliance ?? 0,
 risk_financial: entity.risk_financial ?? 0,
 risk_velocity: entity.risk_velocity ?? 1.0,
 last_audit_date: entity.last_audit_date ?? null,
 next_audit_due: entity.next_audit_due ?? null,
 audit_frequency: entity.audit_frequency ?? null,
 open_finding_count: findingCount ?? 0,
 descendant_count: descendantCount ?? 0,
 };
}

export function useEntityRiskSummary(entityId: string | null) {
 return useQuery({
 queryKey: KEYS.entityRisk(entityId ?? ''),
 enabled: !!entityId,
 queryFn: () => fetchEntityRiskSummary(entityId!),
 staleTime: 0, // Her açılışta fresh veri
 });
}

// ─── Arama ───────────────────────────────────────────────────────────────────

export async function searchAuditUniverse(query: string): Promise<AuditEntity[]> {
 if (!query.trim()) return [];
 const { data, error } = await supabase
 .from('audit_entities')
 .select('id, name, path, type, risk_score')
 .ilike('name', `%${query}%`)
 .order('path')
 .limit(20);
 if (error) throw error;
 return (data ?? []) as AuditEntity[];
}

export function useUniverseSearch(query: string) {
 return useQuery({
 queryKey: KEYS.search(query),
 enabled: query.trim().length >= 2,
 queryFn: () => searchAuditUniverse(query),
 staleTime: 10_000,
 });
}

// ─── Impact Analysis API ──────────────────────────────────────────────────────

export async function fetchEntityImpactAnalysis(entityId: string): Promise<EntityImpactAnalysis> {
 const { data, error } = await supabase.rpc('get_entity_impact_analysis', {
 p_entity_id: entityId,
 });
 if (error) throw error;
 return data as EntityImpactAnalysis;
}

export function useEntityImpactAnalysis(entityId: string | null) {
 return useQuery({
 queryKey: KEYS.impact(entityId ?? ''),
 queryFn: () => fetchEntityImpactAnalysis(entityId!),
 enabled: !!entityId,
 staleTime: 0,
 });
}

// ─── Entity Silme API ─────────────────────────────────────────────────────────

export async function archiveAuditEntity(entityId: string): Promise<void> {
 const { error } = await supabase
 .from('audit_entities')
 .update({ status: 'ARCHIVED' })
 .eq('id', entityId);
 if (error) throw error;
}

