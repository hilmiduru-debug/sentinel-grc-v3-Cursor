/**
 * Yönetici Özeti (Executive Summary) — Gerçek AI entegrasyonu
 *
 * generateSummary: useSentinelAI motoru (Groq/Gemini/OpenAI) aracılığıyla
 * gerçek CAE/Board özeti üretir. Sonucu hem local store'a hem de (mümkünse)
 * DB'ye yazar. DB hatası olursa local store'da tutulur — UI çökmez.
 */

import { fetchReportData } from '@/entities/report/api/report-api';
import { useAISettingsStore } from '@/features/ai-agents/model/ai-settings-store';
import { createEngine } from '@/shared/api/ai/engine';
import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const QUERY_KEY_PREFIX = 'report-summary';

/** CAE / Yönetim Kurulu System Prompt */
const BOARD_SYSTEM_PROMPT =
  'Sen Sentinel GRC sisteminin Başdenetçisisin (CAE). ' +
  'Rapor verilerini analiz ederek Yönetim Kurulu (Board of Directors) için ' +
  '3 paragraflık, net, finansal ve operasyonel risk odaklı bir "Yönetici Özeti" yaz. ' +
  'Kurumsal, adli ve tavizsiz bir dil kullan. Türkçe yanıt ver.';

interface FindingRow {
  id: string;
  title: string;
  severity: string;
  detection_html?: string;
  impact_score?: number;
}

async function fetchFindingsByEngagement(engagementId: string): Promise<FindingRow[]> {
  if (!engagementId) return [];
  const { data, error } = await supabase
    .from('audit_findings')
    .select('id, title, severity, detection_html, impact_score')
    .eq('engagement_id', engagementId)
    .in('severity', ['HIGH', 'CRITICAL'])
    .order('severity', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FindingRow[];
}

export interface GenerateSummaryInput {
  reportId: string;
}

// ─── Tip güvenli AI çağrısı (hook dışında kullanmak için store'dan config alır) ──

async function callAIForSummary(
  reportTitle: string,
  findings: FindingRow[],
): Promise<string> {
  // Store'dan güncel config al (hook dışında çalışır)
  const store = useAISettingsStore.getState();

  if (!store.isConfigured()) {
    throw new Error(
      'AI motoru yapılandırılmamış. Ayarlar > Cognitive Engine sayfasından API anahtarınızı girin.',
    );
  }

  const config = store.getConfig();
  const engine = createEngine(config);

  const findingSummary = (findings || [])
    .slice(0, 10)
    .map(
      (f) =>
        `- [${f.severity}] ${f.title}` +
        (f.impact_score ? ` (Etki Skoru: ${f.impact_score})` : ''),
    )
    .join('\n');

  const prompt =
    `Rapor Başlığı: ${reportTitle}\n` +
    `Kritik/Yüksek Bulgu Sayısı: ${findings.length}\n\n` +
    `Bulgular:\n${findingSummary || 'Yüksek/kritik bulgu bulunamadı.'}\n\n` +
    `Lütfen Yönetim Kurulu için 3 paragraflık "Yönetici Özeti" oluştur. ` +
    `Doğrudan özetten başla. Mevzuat referansları ve finansal risk rakamlarına yer ver.`;

  const text = await engine.generateText(prompt, BOARD_SYSTEM_PROMPT);
  if (!text || !text.trim()) {
    throw new Error('AI yanıt üretemedi. Lütfen tekrar deneyin.');
  }
  return text;
}

/** AI ile özet üret → DB'ye kaydet (DB hatası olursa fırlatır, caller handle eder) */
async function generateSummaryPayload(reportId: string): Promise<{
  aiText: string;
  dbSaved: boolean;
  report: Awaited<ReturnType<typeof fetchReportData>>;
}> {
  // 1. Raporu ve bulguları çek
  const { data: reportRow, error: reportError } = await supabase
    .from('reports')
    .select('id, engagement_id, executive_summary, title')
    .eq('id', reportId)
    .maybeSingle();

  if (reportError) throw reportError;
  if (!reportRow) throw new Error('Rapor bulunamadı.');

  const engagementId = (reportRow.engagement_id as string) ?? '';
  const reportTitle = (reportRow.title as string) ?? 'Denetim Raporu';
  const findings = await fetchFindingsByEngagement(engagementId);

  // 2. Gerçek AI çağrısı
  const aiText = await callAIForSummary(reportTitle, findings);

  // 3. Executive summary yapısını güncelle
  const current = ((reportRow.executive_summary ?? {}) as Record<string, unknown>);
  const sections = (current.sections as Record<string, string>) ?? {};
  const updatedSummary: Record<string, unknown> = {
    ...current,
    briefingNote: aiText,
    sections: {
      ...sections,
      auditOpinion: `<p>${aiText.split('\n\n')[0] ?? aiText}</p>`,
      criticalRisks:
        sections.criticalRisks ||
        (findings.length > 0
          ? `<p>Kritik/yüksek bulgular: ${(findings || []).map((f) => `<strong>${f.title}</strong>`).join(', ')}.</p>`
          : '<p>Kritik/yüksek öncelikli bulgu yok.</p>'),
    },
    aiGeneratedAt: new Date().toISOString(),
  };

  // 4. DB'ye yaz (RLS hatası olursa UI çökmez — caller toast atar)
  let dbSaved = false;
  const { error: updateError } = await supabase
    .from('reports')
    .update({
      executive_summary: updatedSummary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (updateError) {
    // DB kaydı başarısız ama AI metni üretildi — caller local state'e yazabilir
    console.warn('[useReportSummary] DB update failed (RLS?):', updateError.message);
    // Hata fırlatmıyoruz — aiText ile devam
  } else {
    dbSaved = true;
  }

  const refreshed = dbSaved ? await fetchReportData(reportId) : null;
  return { aiText, dbSaved, report: refreshed };
}

export function useReportSummary(reportId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: report = null, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY_PREFIX, reportId ?? ''],
    queryFn: () => fetchReportData(reportId!),
    enabled: Boolean(reportId),
  });

  const generateMutation = useMutation({
    mutationFn: ({ reportId: id }: GenerateSummaryInput) => generateSummaryPayload(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX, variables.reportId] });
    },
    // Hatayı caller'a bırak (ExecutiveSummaryStudio toast atar)
  });

  return {
    report,
    isLoading,
    refetch,
    generateSummary: generateMutation.mutateAsync,
    generateMutation,
    isGenerating: generateMutation.isPending,
  };
}
