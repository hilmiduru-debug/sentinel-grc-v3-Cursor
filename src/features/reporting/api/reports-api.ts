/**
 * Rapor listesi — Tek doğru kaynak: public.reports tablosu
 * Mock yok; Supabase reports + isteğe bağlı audit_engagements JOIN
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

/**
 * reports tablosu + engagement (JOIN) + bulgu sayısı — Tek doğru kaynak tipi.
 */
export interface ReportListItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  version: number;
  parent_report_id: string | null;
  amendment_note: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  published_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
  engagement_id: string | null;
  /** Denetim görevi adı (audit_engagements.title) */
  engagement_title: string | null;
  /** Denetim risk skoru (audit_engagements.risk_snapshot_score) — 0–100 veya null */
  engagement_risk_score: number | null;
  /** Denetim harf notu (audit_engagements.letter_grade) — A–F veya null */
  engagement_letter_grade: string | null;
  /** Bu denetime bağlı audit_findings sayısı (engagement_id üzerinden) */
  findings_count: number;
  /** Rapor türü (İç Denetim, Bilgi Sistemleri, Süreç Denetimi vb.) */
  report_type: string | null;
  /** Rapor notu (A (Güçlü), B (Yeterli), C (Gelişim Alanı) vb.) */
  report_grade: string | null;
  /** Hassas skor (0–100, örn. 82.4) */
  precise_score: number | null;
  /** Önceki dönem notu (örn. B (Yeterli)) */
  previous_grade: string | null;
  /** Risk seviyesi: high, medium, low */
  risk_level: string | null;
}

/** Entity tipi: Report = ReportListItem (Supabase reports tablosu) */
export type Report = ReportListItem;

const REPORTS_QUERY_KEY = ['reports-list'] as const;

/** audit_engagements: Sadece title — varlığı garanti; risk_snapshot_score şemada olmayabilir. */
type EngagementRow = { title?: string } | null;

/** Satırı ReportListItem'e dönüştür (engagement_risk_score yoksa null). */
function mapRowToListItem(row: Record<string, unknown>, countByEngagement: Record<string, number>): ReportListItem {
  const eid = (row.engagement_id as string) ?? null;
  const engagement = row.audit_engagements as EngagementRow | undefined;
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    status: (row.status as string) ?? 'draft',
    version: (row.version as number) ?? 1,
    parent_report_id: (row.parent_report_id as string) ?? null,
    amendment_note: (row.amendment_note as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    published_at: (row.published_at as string) ?? null,
    published_by: (row.published_by as string) ?? null,
    locked_at: (row.locked_at as string) ?? null,
    locked_by: (row.locked_by as string) ?? null,
    engagement_id: eid,
    engagement_title: engagement?.title ?? null,
    engagement_risk_score: null,
    engagement_letter_grade: null,
    findings_count: eid ? (countByEngagement[eid] ?? 0) : 0,
    report_type: (row.report_type as string) ?? null,
    report_grade: (row.report_grade as string) ?? null,
    precise_score: row.precise_score != null ? Number(row.precise_score) : null,
    previous_grade: (row.previous_grade as string) ?? null,
    risk_level: (row.risk_level as string) ?? null,
  } satisfies ReportListItem;
}

/**
 * Tüm raporları getirir. Dev modunda tenant_id filtresi YOK — veritabanındaki
 * tüm raporlar döner (RLS migration ile erişim açıldı).
 */
async function fetchReports(): Promise<ReportListItem[]> {
  const selectColumns =
    'id, title, description, status, version, parent_report_id, amendment_note, created_at, updated_at, published_at, published_by, locked_at, locked_by, engagement_id, report_type, report_grade, precise_score, previous_grade, risk_level';

  let data: Array<Record<string, unknown>>;
  let usedJoin = false;

  const withJoin = await supabase
    .from('reports')
    .select(`${selectColumns}, audit_engagements!reports_engagement_id_fkey(title)`)
    .order('created_at', { ascending: false });

  if (!withJoin.error) {
    data = (withJoin.data ?? []) as Array<Record<string, unknown>>;
    usedJoin = true;
  } else {
    if (withJoin.error) {
      console.error('Supabase Reports API Error (JOIN):', withJoin.error.message);
    }
    const withoutJoin = await supabase
      .from('reports')
      .select(selectColumns)
      .order('created_at', { ascending: false });
    if (withoutJoin.error) {
      console.error('Supabase Reports API Error (reports only):', withoutJoin.error.message);
      throw withoutJoin.error;
    }
    data = (withoutJoin.data ?? []) as Array<Record<string, unknown>>;
  }

  const rows = data ?? [];
  console.log('Fetched Reports Data:', { rowCount: rows.length, raw: rows });
  const engagementIds = [...new Set(
    rows
      .map((r) => r.engagement_id as string | null)
      .filter((id): id is string => Boolean(id)),
  )];

  let countByEngagement: Record<string, number> = {};
  if (engagementIds.length > 0) {
    try {
      const { data: findingRows, error: findingsError } = await supabase
        .from('audit_findings')
        .select('engagement_id')
        .in('engagement_id', engagementIds);
      if (findingsError) {
        console.warn('Supabase Reports API: audit_findings count skipped:', findingsError.message);
      } else {
        const list = (findingRows ?? []) as Array<{ engagement_id: string }>;
        countByEngagement = list.reduce<Record<string, number>>((acc, row) => {
          const id = row.engagement_id;
          acc[id] = (acc[id] ?? 0) + 1;
          return acc;
        }, {});
      }
    } catch (e) {
      console.warn('Supabase Reports API: audit_findings count failed, using 0:', e);
    }
  }

  return rows.map((row) => {
    if (!usedJoin) {
      return mapRowToListItem({ ...row, audit_engagements: null }, countByEngagement);
    }
    return mapRowToListItem(row, countByEngagement);
  });
}

export function useReports() {
  const query = useQuery({
    queryKey: REPORTS_QUERY_KEY,
    queryFn: fetchReports,
    staleTime: 60_000,
  });

  return {
    reports: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error
      ? (query.error as Error)?.message ?? String(query.error)
      : null,
    refetch: query.refetch,
  };
}

export { REPORTS_QUERY_KEY };

/** Varsayılan tenant (demo/seed ile uyumlu) */
const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

/**
 * reports tablosunda yeni taslak rapor oluşturur (Tek doğru kaynak).
 * Mock yok; doğrudan Supabase INSERT.
 */
export async function createReport(options?: {
  title?: string;
  description?: string;
  engagement_id?: string;
  tenant_id?: string;
}): Promise<string> {
  const title =
    options?.title ??
    `Yeni Denetim Raporu — ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;
  const { data, error } = await supabase
    .from('reports')
    .insert({
      tenant_id: options?.tenant_id ?? DEFAULT_TENANT_ID,
      title,
      description: options?.description ?? '',
      status: 'draft',
      engagement_id: options?.engagement_id ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('Rapor oluşturuldu ancak ID alınamadı.');
  return data.id as string;
}
