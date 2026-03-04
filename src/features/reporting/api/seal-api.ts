/**
 * Nihai Rapor Mühürleme API — WORM (Write Once, Read Many).
 * reports tablosu: status, published_at, locked_at, hash_seal (opsiyonel).
 * Mock kullanılmaz; tüm işlemler Supabase üzerinden.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { generateRecordHash, canonicalStringify } from '@/shared/lib/crypto';

export interface ReportSealRow {
  id: string;
  title: string;
  status: string;
  hash_seal: string | null;
  published_at: string | null;
  tiptap_content: Record<string, unknown> | null;
  snapshot_data: Record<string, unknown> | null;
}

/** Mühürlenecek raporun güncel içeriğini çeker. */
export async function fetchReportForSealing(reportId: string): Promise<ReportSealRow | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, title, status, hash_seal, published_at, tiptap_content, snapshot_data')
    .eq('id', reportId)
    .maybeSingle();

  if (error) throw error;
  return data as ReportSealRow | null;
}

/**
 * Raporu kilitler: status = 'published', published_at ve locked_at damgası.
 * Hash varsa SHA-256 ile mühürlenir; yoksa sadece status güncellenir.
 */
export async function sealReport(report: ReportSealRow): Promise<string> {
  const published = report.status === 'published';
  if (published && report.hash_seal) {
    throw new Error('Bu rapor zaten mühürlenmiş. WORM protokolü gereği yeniden mühürleme yasaktır.');
  }

  const sealedAt = new Date().toISOString();
  const contentForHash: Record<string, unknown> = {
    id: report.id,
    title: report.title,
    tiptap_content: report.tiptap_content ?? null,
    snapshot_data: report.snapshot_data ?? null,
  };

  let hash: string | null = null;
  try {
    hash = await generateRecordHash(contentForHash);
  } catch {
    hash = null;
  }

  const { data: user } = (await supabase.auth.getUser()).data;
  const updatePayload: Record<string, unknown> = {
    status: 'published',
    published_at: sealedAt,
    locked_at: sealedAt,
    ...(user?.id && { published_by: user.id }),
    ...(user?.id && { locked_by: user.id }),
    updated_at: sealedAt,
  };
  if (hash != null) {
    updatePayload.hash_seal = hash;
  }

  const { error } = await supabase
    .from('reports')
    .update(updatePayload)
    .eq('id', report.id);

  if (error) throw error;

  return hash ?? sealedAt;
}

/**
 * Mühür doğrulama — kaydedilen hash ile anlık içerik hash'i karşılaştırır.
 * Adli izlenebilirlik için kullanılır.
 */
export async function verifyReportSeal(report: ReportSealRow): Promise<boolean> {
  if (!report.hash_seal) return false;

  const contentForHash: Record<string, unknown> = {
    id: report.id,
    title: report.title,
    tiptap_content: report.tiptap_content ?? null,
    snapshot_data: report.snapshot_data ?? null,
  };

  const currentHash = await generateRecordHash(contentForHash);
  return currentHash === report.hash_seal;
}

/** Onay/review aşamasındaki raporları getirir (mühürlenebilecek adaylar). */
export async function fetchReportsAwaitingPublish(): Promise<ReportSealRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, title, status, hash_seal, published_at, tiptap_content, snapshot_data')
    .in('status', ['review', 'draft'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReportSealRow[];
}

/** useSealReport — Nihai mühürleme için React Query mutasyonu. */
export function useSealReport(reportId: string | null, options?: { onSuccess?: () => void; onError?: (err: Error) => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!reportId) throw new Error('Rapor ID gerekli.');
      const report = await fetchReportForSealing(reportId);
      if (!report) throw new Error('Rapor bulunamadı.');
      return sealReport(report);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report-for-seal', reportId] });
      void queryClient.invalidateQueries({ queryKey: ['reports-awaiting-publish'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/** canonicalStringify'ı dışa açıyoruz — UI'daki önizleme için */
export { canonicalStringify };
