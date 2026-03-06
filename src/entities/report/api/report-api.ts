/**
 * Rapor API — Tek doğru kaynak: public.reports + report_blocks
 */

import { supabase } from '@/shared/api/supabase';
import type {
  M6Report,
  M6ReportBlock,
  M6ReviewNote,
  ReportSection,
  ExecutiveSummary,
} from '../model/types';

const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

// ─── DB row types (reports + report_blocks) ───────────────────────────────────

interface DbReportBlock {
  id: string;
  report_id: string;
  position_index: number;
  parent_block_id: string | null;
  depth_level: number;
  block_type: string;
  content?: Record<string, unknown>;
  snapshot_data?: Record<string, unknown> | null;
}

interface DbExecutiveSummary {
  score?: number;
  grade?: string;
  assuranceLevel?: string;
  assurance_level?: string;
  trend?: number;
  trendDelta?: number;
  previousGrade?: string;
  previous_grade?: string;
  findingCounts?: { critical: number; high: number; medium: number; low: number; observation: number };
  keyMetrics?: { criticalFindings?: number; highFindings?: number; mediumFindings?: number; lowFindings?: number };
  briefingNote?: string;
  boardNote?: string;
  aiNarrative?: string;
  sections?: { auditOpinion?: string; criticalRisks?: string; strategicRecommendations?: string; managementAction?: string };
  managementResponse?: string;
  layoutType?: string;
  dynamicMetrics?: unknown;
  dynamicSections?: unknown;
}

interface DbReportRow {
  id: string;
  tenant_id: string;
  engagement_id: string | null;
  title: string;
  status: string;
  theme_config?: Record<string, unknown>;
  executive_summary?: DbExecutiveSummary | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  hash_seal?: string | null;
  [key: string]: unknown;
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

/** Blok yoksa Zen Editor çökmesin diye varsayılan blok ID'leri. */
const DEFAULT_HEADING_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_PARAGRAPH_ID = '00000000-0000-0000-0000-000000000002';

function mapDbBlockToFrontend(dbBlock: DbReportBlock | null | undefined): M6ReportBlock {
  if (!dbBlock) {
    return {
      id: DEFAULT_HEADING_ID,
      type: 'paragraph',
      orderIndex: 0,
      content: {},
      snapshotData: null,
    } as M6ReportBlock;
  }
  const content = dbBlock.content != null && typeof dbBlock.content === 'object' && !Array.isArray(dbBlock.content)
    ? dbBlock.content
    : { text: '' };
  return {
    id: dbBlock.id,
    type: (dbBlock.block_type ?? 'paragraph') as M6ReportBlock['type'],
    orderIndex: dbBlock.position_index ?? 0,
    content,
    snapshotData: dbBlock.snapshot_data ?? null,
  } as M6ReportBlock;
}

/** Rapor yok veya executive_summary null/undefined olduğunda kullanılacak varsayılan özet (UI crash önleme). */
export const DEFAULT_EXECUTIVE_SUMMARY: ExecutiveSummary = {
  score: 0,
  grade: 'N/A',
  assuranceLevel: '',
  trend: 0,
  previousGrade: '',
  findingCounts: { critical: 0, high: 0, medium: 0, low: 0, observation: 0 },
  briefingNote: '',
  sections: {
    auditOpinion: '',
    criticalRisks: '',
    strategicRecommendations: '',
    managementAction: '',
  },
};

/** DB'den null, string (JSON) veya obje gelebilir; UI çökmesin diye her zaman obje. */
function sanitizeExecutiveSummary(raw: unknown): DbExecutiveSummary | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as DbExecutiveSummary;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === 'object' && parsed != null && !Array.isArray(parsed) ? (parsed as DbExecutiveSummary) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function mapDbExecutiveSummary(dbSummary: DbExecutiveSummary | null | undefined): ExecutiveSummary {
  const safe = sanitizeExecutiveSummary(dbSummary);
  if (!safe) return DEFAULT_EXECUTIVE_SUMMARY;
  return {
    score: safe.score ?? 0,
    grade: safe.grade ?? 'N/A',
    assuranceLevel: safe.assuranceLevel ?? safe.assurance_level ?? '',
    trend: typeof safe.trend === 'number'
      ? safe.trend
      : (safe.trendDelta ?? 0),
    previousGrade: safe.previousGrade ?? safe.previous_grade ?? '',
    findingCounts: safe.findingCounts ?? {
      critical: safe.keyMetrics?.criticalFindings ?? 0,
      high: safe.keyMetrics?.highFindings ?? 0,
      medium: safe.keyMetrics?.mediumFindings ?? 0,
      low: safe.keyMetrics?.lowFindings ?? 0,
      observation: 0,
    },
    briefingNote:
      safe.briefingNote ??
      safe.boardNote ??
      safe.aiNarrative ??
      '',
    sections: safe.sections ?? {
      auditOpinion: safe.aiNarrative ?? '',
      criticalRisks: '',
      strategicRecommendations: '',
      managementAction: '',
    },
    managementResponse: safe.managementResponse,
    layoutType: safe.layoutType ?? undefined,
    dynamicMetrics: safe.dynamicMetrics ?? undefined,
    dynamicSections: safe.dynamicSections ?? undefined,
  };
}

function getDefaultBlocksForEmptyReport(_reportId: string): DbReportBlock[] {
  return [
    {
      id: DEFAULT_HEADING_ID,
      report_id: _reportId,
      position_index: 0,
      parent_block_id: null,
      depth_level: 0,
      block_type: 'heading',
      content: { text: 'Yönetici Özeti', level: 1 },
    },
    {
      id: DEFAULT_PARAGRAPH_ID,
      report_id: _reportId,
      position_index: 1,
      parent_block_id: DEFAULT_HEADING_ID,
      depth_level: 0,
      block_type: 'paragraph',
      content: { text: 'İçerik buraya yazılacak.' },
    },
  ];
}

/** report_blocks listesinden bölümlere dönüştür: depth 0 + heading level 1 = bölüm başlığı, child'lar = bölüm blokları */
function blocksToSections(blocks: DbReportBlock[]): ReportSection[] {
  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const sorted = [...safeBlocks].sort((a, b) => (a?.position_index ?? 0) - (b?.position_index ?? 0));
  const topLevel = sorted.filter((b) => b && b.parent_block_id == null);
  const sections: ReportSection[] = [];
  for (let i = 0; i < topLevel.length; i++) {
    const head = topLevel[i];
    if (!head) continue;
    const isSectionHeader =
      head.block_type === 'heading' &&
      (head.content as { level?: number } | undefined)?.level === 1;
    const title = isSectionHeader
      ? String((head.content as { text?: string } | undefined)?.text ?? 'Bölüm')
      : 'İçerik';
    const childBlocks = sorted.filter((b) => b && b.parent_block_id === head.id);
    const sectionBlocks = isSectionHeader ? [head, ...childBlocks] : [head];
    sections.push({
      id: head.id,
      title,
      orderIndex: i,
      blocks: sectionBlocks.map(mapDbBlockToFrontend),
    });
  }
  if (sections.length === 0 && sorted.length > 0) {
    sections.push({
      id: 'default',
      title: 'İçerik',
      orderIndex: 0,
      blocks: sorted.map(mapDbBlockToFrontend),
    });
  }
  return sections;
}

export function mapDbReportToFrontend(dbReport: DbReportRow, blocks: DbReportBlock[]): M6Report {
  const safeBlocks = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
  const sections = blocksToSections(safeBlocks);
  return {
    id: dbReport.id,
    engagementId: dbReport.engagement_id ?? '',
    title: dbReport.title ?? '',
    status: (dbReport.status ?? 'draft') as M6Report['status'],
    themeConfig: (dbReport.theme_config as M6Report['themeConfig']) ?? {
      paperStyle: 'zen_paper',
      typography: 'merriweather_inter',
    },
    sections,
    executiveSummary: mapDbExecutiveSummary(dbReport.executive_summary),
    workflow: {},
    reviewNotes: [],
    createdAt: dbReport.created_at,
    updatedAt: dbReport.updated_at,
    publishedAt: dbReport.published_at ?? undefined,
    hashSeal: dbReport.hash_seal ?? undefined,
    precise_score: dbReport.precise_score != null ? Number(dbReport.precise_score) : null,
    report_grade: (dbReport.report_grade as string) ?? null,
    previous_grade: (dbReport.previous_grade as string) ?? null,
    risk_level: (dbReport.risk_level as string) ?? null,
    report_type: (dbReport.report_type as string) ?? null,
  };
}

export async function fetchReportData(reportId: string): Promise<M6Report | null> {
  const { data: reportRow, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();
  if (reportError) throw reportError;
  if (!reportRow) return null;

  const { data: blocksRaw, error: blocksError } = await supabase
    .from('report_blocks')
    .select('*')
    .eq('report_id', reportId)
    .order('position_index', { ascending: true });
  if (blocksError) throw blocksError;

  const blocks = Array.isArray(blocksRaw) && blocksRaw.length > 0
    ? (blocksRaw as DbReportBlock[]).filter(Boolean)
    : getDefaultBlocksForEmptyReport(reportId);

  return mapDbReportToFrontend(reportRow as DbReportRow, blocks);
}

export async function fetchFirstDraftReport(): Promise<string | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('id')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function createSectionDb(
  reportId: string,
  title: string,
  orderIndex: number,
): Promise<{ id: string; title: string; orderIndex: number }> {
  const { data: report } = await supabase.from('reports').select('tenant_id').eq('id', reportId).single();
  const tenantId = (report?.tenant_id as string) ?? DEFAULT_TENANT_ID;
  const { data: block, error } = await supabase
    .from('report_blocks')
    .insert({
      tenant_id: tenantId,
      report_id: reportId,
      parent_block_id: null,
      position_index: orderIndex,
      depth_level: 0,
      block_type: 'heading',
      content: { text: title, level: 1 },
    })
    .select('id')
    .single();
  if (error) throw error;
  if (!block) throw new Error('Bölüm oluşturulamadı.');
  return { id: block.id, title, orderIndex };
}

export async function updateReportMetaDb(reportId: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('reports').update(payload).eq('id', reportId);
  if (error) throw error;
}

export async function upsertBlockDb(reportId: string, sectionId: string, block: M6ReportBlock): Promise<void> {
  const { data: report } = await supabase.from('reports').select('tenant_id').eq('id', reportId).single();
  const tenantId = (report?.tenant_id as string) ?? DEFAULT_TENANT_ID;
  const row = {
    tenant_id: tenantId,
    report_id: reportId,
    parent_block_id: sectionId,
    position_index: block.orderIndex,
    depth_level: 1,
    block_type: block.type,
    content: block.content ?? {},
    snapshot_data: block.snapshotData ?? null,
  };
  const { error } = await supabase
    .from('report_blocks')
    .upsert({ id: block.id, ...row }, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateBlockOrdersDb(
  blocks: { id: string; order_index: number }[],
): Promise<void> {
  for (const b of blocks) {
    const { error } = await supabase
      .from('report_blocks')
      .update({ position_index: b.order_index })
      .eq('id', b.id);
    if (error) throw error;
  }
}

export async function deleteBlockDb(blockId: string): Promise<void> {
  const { error } = await supabase.from('report_blocks').delete().eq('id', blockId);
  if (error) throw error;
}

export async function publishReportApi(
  reportId: string,
  hashSeal: string,
  blocksSnapshotMap: Record<string, unknown>,
): Promise<void> {
  const now = new Date().toISOString();
  const { error: reportError } = await supabase
    .from('reports')
    .update({ status: 'published', published_at: now, locked_at: now })
    .eq('id', reportId);
  if (reportError) throw reportError;
  for (const [blockId, snapshotData] of Object.entries(blocksSnapshotMap)) {
    const { error } = await supabase
      .from('report_blocks')
      .update({ snapshot_data: snapshotData })
      .eq('id', blockId);
    if (error) throw error;
  }
}
