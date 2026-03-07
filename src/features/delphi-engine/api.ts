/**
 * Delphi Engine – RKM (rkm_risks) tablosu ile risk oylama ve konsensüs mühürleme.
 * Wave 27: delphi_queries ve generated_probes tabloları ile NL → Probe kayıt API'si.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import type { DelphiRisk, Vote } from './types';
import type { AIProbeConfig } from '@/shared/api/sentinel-ai';

const QUERY_KEY = ['delphi-risks'] as const;
const DQ_KEY = ['delphi-queries'] as const;
const GP_KEY = ['generated-probes'] as const;

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

/** Supabase rkm_risks satırı (Delphi için gerekli alanlar) */
interface RkmRiskRow {
  id: string;
  risk_title: string;
  risk_description: string | null;
  risk_category: string | null;
  risk_status: string | null;
  inherent_impact: number | null;
  inherent_likelihood: number | null;
  inherent_volume: number | null;
}

function clampScore(v: number | null | undefined): number {
  if (v == null || Number.isNaN(v)) return 3;
  return Math.max(1, Math.min(5, Math.round(v)));
}

/**
 * rkm_risks tablosundan ACTIVE statülü ilk 10 riski çeker;
 * DelphiRisk + mevcut skorlar (currentVote) formatına map eder.
 */
export async function fetchDelphiRisks(): Promise<DelphiRisk[]> {
  const { data, error } = await supabase
    .from('rkm_risks')
    .select('id, risk_title, risk_description, risk_category, risk_status, inherent_impact, inherent_likelihood, inherent_volume')
    .eq('risk_status', 'ACTIVE')
    .order('risk_code', { ascending: true })
    .limit(10);

  if (error) throw error;
  const rows = (data ?? []) as RkmRiskRow[];

  return rows.map((r) => {
    const impact = clampScore(r.inherent_impact);
    const likelihood = clampScore(r.inherent_likelihood);
    const volume = clampScore(r.inherent_volume);
    return {
      id: r.id,
      title: r.risk_title ?? 'Başlıksız Risk',
      description: r.risk_description ?? '',
      category: r.risk_category ?? 'Genel',
      currentVote: {
        impact,
        likelihood,
        velocity: volume,
      },
    } as DelphiRisk;
  });
}

export function useDelphiRisks() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchDelphiRisks,
  });
}

export interface DelphiConsensusUpdate {
  riskId: string;
  vote: Vote;
}

/**
 * Tek bir riskin inherent skorlarını günceller (rkm_risks UPDATE).
 */
async function updateRkmRiskScores(riskId: string, vote: Vote): Promise<void> {
  const { error } = await supabase
    .from('rkm_risks')
    .update({
      inherent_impact: Math.max(1, Math.min(5, vote.impact)),
      inherent_likelihood: Math.max(1, Math.min(5, vote.likelihood)),
      inherent_volume: Math.max(1, Math.min(5, vote.velocity)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', riskId);

  if (error) throw error;
}

/**
 * Birden fazla riskin konsensüs skorlarını rkm_risks tablosuna yazar.
 */
export async function saveDelphiConsensus(updates: DelphiConsensusUpdate[]): Promise<void> {
  for (const { riskId, vote } of updates) {
    await updateRkmRiskScores(riskId, vote);
  }
}

export function useSaveDelphiConsensus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: DelphiConsensusUpdate[]) => saveDelphiConsensus(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/* ====================================================================
   WAVE 27 — delphi_queries + generated_probes Supabase entegrasyonu
   ==================================================================== */

export interface DelphiQueryRow {
  id: string;
  input_text: string;
  status: 'PENDING' | 'GENERATED' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
}

export interface GeneratedProbeRow {
  id: string;
  query_id: string | null;
  title: string;
  description: string;
  category: string;
  severity: string;
  source: string;
  query_payload: string;
  schedule_cron: string;
  risk_threshold: number;
  reasoning: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DEPLOYED';
  created_at: string;
}

/** delphi_queries geçmişini çeker (en yeni 20 kayıt) */
export function useDelphiQueries() {
  return useQuery<DelphiQueryRow[]>({
    queryKey: DQ_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delphi_queries')
        .select('id, input_text, status, created_at')
        .eq('tenant_id', TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as DelphiQueryRow[];
    },
    staleTime: 30_000,
  });
}

/** generated_probes listesini çeker */
export function useGeneratedProbes() {
  return useQuery<GeneratedProbeRow[]>({
    queryKey: GP_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_probes')
        .select('id, query_id, title, description, category, severity, source, query_payload, schedule_cron, risk_threshold, reasoning, status, created_at')
        .eq('tenant_id', TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as GeneratedProbeRow[];
    },
    staleTime: 30_000,
  });
}

interface SaveProbePayload {
  inputText: string;
  probe: AIProbeConfig;
}

/**
 * 1) delphi_queries'e kullanıcı girişini kaydet
 * 2) generated_probes'a AI sonucunu kaydet
 * Savunmacı programlama: her adımda hata fırlatmak yerine loglar.
 */
export async function saveGeneratedProbe(payload: SaveProbePayload): Promise<GeneratedProbeRow | null> {
  try {
    // Step 1: delphi_queries INSERT
    const { data: queryRow, error: qErr } = await supabase
      .from('delphi_queries')
      .insert({
        tenant_id: TENANT_ID,
        input_text: payload.inputText ?? '',
        status: 'GENERATED',
      })
      .select('id')
      .single();

    if (qErr) {
      console.warn('[Delphi] delphi_queries insert failed:', qErr.message);
    }
    const queryId = queryRow?.id ?? null;

    // Step 2: generated_probes INSERT
    const { data: probeRow, error: pErr } = await supabase
      .from('generated_probes')
      .insert({
        tenant_id: TENANT_ID,
        query_id: queryId,
        title: payload.probe.title ?? '',
        description: payload.probe.description ?? '',
        category: payload.probe.category ?? 'OPS',
        severity: payload.probe.severity ?? 'MEDIUM',
        source: payload.probe.source ?? 'core_banking',
        query_payload: payload.probe.query_payload ?? '',
        schedule_cron: payload.probe.schedule_cron ?? '0 */4 * * *',
        risk_threshold: payload.probe.risk_threshold ?? 5,
        reasoning: payload.probe.reasoning ?? '',
        status: 'PENDING',
      })
      .select()
      .single();

    if (pErr) throw pErr;
    return probeRow as GeneratedProbeRow;
  } catch (err) {
    console.error('[Delphi] saveGeneratedProbe error:', err);
    return null;
  }
}

export function useSaveGeneratedProbe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveProbePayload) => saveGeneratedProbe(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DQ_KEY });
      queryClient.invalidateQueries({ queryKey: GP_KEY });
    },
  });
}

/** generated_probes status güncelle (ACCEPTED / REJECTED / DEPLOYED) */
export function useUpdateProbeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ probeId, status }: { probeId: string; status: 'ACCEPTED' | 'REJECTED' | 'DEPLOYED' }) => {
      const { error } = await supabase
        .from('generated_probes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', probeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GP_KEY });
    },
  });
}
