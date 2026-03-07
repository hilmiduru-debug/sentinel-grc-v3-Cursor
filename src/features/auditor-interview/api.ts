/**
 * Cognitive Interview Assistant — Feature API
 * Wave 50: Bilişsel Denetim Mülakat Asistanı
 *
 * FSD: features/auditor-interview/api.ts
 * Fallback: (transcript || 'Kayıt bulunamadı') her metin alanında zorunlu
 * Tüm diziler: (data || []).map ile korunur
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SentimentType = 'Pozitif' | 'Şüpheli' | 'Stresli' | 'Nötr' | 'Savunmacı' | 'Kaçamak';
export type SessionStatus = 'Planlandı' | 'Devam Ediyor' | 'Tamamlandı' | 'İptal';

export interface InterviewSession {
  id: string;
  tenant_id: string;
  title: string;
  subject_name: string;
  subject_title: string;
  subject_department: string;
  interviewer_name: string;
  engagement_id: string | null;
  purpose: string;
  location: string;
  status: SessionStatus;
  risk_topics: string[];
  audio_url: string | null;
  overall_sentiment: SentimentType;
  ai_risk_score: number;
  duration_seconds: number;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TranscriptLine {
  id: string;
  tenant_id: string;
  session_id: string;
  line_order: number;
  speaker: 'Denetçi' | 'Muhatap';
  transcript: string;
  sentiment: SentimentType;
  confidence: number;
  ai_flag: string | null;
  ai_note: string | null;
  keywords: string[];
  start_ms: number;
  end_ms: number;
  created_at: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

const SESSION_KEY    = ['interview-sessions'] as const;
const TRANSCRIPT_KEY = ['transcript-analysis'] as const;

// ─── Interview Hooks ─────────────────────────────────────────────────────────

/**
 * Tüm mülakat oturumlarını listeler
 */
export function useInterviews(status?: SessionStatus) {
  return useQuery({
    queryKey: [...SESSION_KEY, status ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('interview_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) {
        console.error('[Wave50] Failed to fetch interview_sessions:', error);
        return [] as InterviewSession[];
      }
      return (data || []) as InterviewSession[];
    },
    staleTime: 30_000,
  });
}

/**
 * Tek mülakat oturumu detayı
 */
export function useInterview(id: string | undefined) {
  return useQuery({
    queryKey: [...SESSION_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) {
        console.error('[Wave50] Failed to fetch session:', error);
        return null;
      }
      return data as InterviewSession | null;
    },
    staleTime: 15_000,
  });
}

/**
 * Bir oturumun transkript satırlarını getirir
 * Fallback: transcript || 'Kayıt bulunamadı'
 */
export function useTranscript(sessionId: string | undefined) {
  return useQuery({
    queryKey: [...TRANSCRIPT_KEY, sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_analysis')
        .select('*')
        .eq('session_id', sessionId!)
        .order('line_order', { ascending: true });

      if (error) {
        console.error('[Wave50] Failed to fetch transcript_analysis:', error);
        return [] as TranscriptLine[];
      }
      // Fallback: transcript || 'Kayıt bulunamadı'
      return (data || []).map((row: any) => ({
        ...row,
        transcript: row?.transcript || 'Kayıt bulunamadı',
        ai_note: row?.ai_note || null,
        keywords: row?.keywords || [],
      })) as TranscriptLine[];
    },
    staleTime: 15_000,
  });
}

/**
 * Yeni mülakat oturumu oluşturur
 */
export function useCreateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      subject_name: string;
      subject_title?: string;
      subject_department?: string;
      interviewer_name: string;
      purpose?: string;
      location?: string;
      risk_topics?: string[];
      scheduled_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .insert({
          title: input?.title ?? '',
          subject_name: input?.subject_name ?? '',
          subject_title: input?.subject_title ?? '',
          subject_department: input?.subject_department ?? '',
          interviewer_name: input?.interviewer_name ?? '',
          purpose: input?.purpose ?? '',
          location: input?.location ?? '',
          risk_topics: input?.risk_topics ?? [],
          status: 'Planlandı',
          overall_sentiment: 'Nötr',
          ai_risk_score: 0,
          scheduled_at: input?.scheduled_at ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InterviewSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    },
  });
}

/**
 * Transkript satırı ekler (gerçek zamanlı mülakatlar için)
 */
export function useAddTranscriptLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      session_id: string;
      line_order: number;
      speaker: 'Denetçi' | 'Muhatap';
      transcript: string;
      sentiment?: SentimentType;
      confidence?: number;
      ai_flag?: string | null;
      ai_note?: string | null;
      keywords?: string[];
      start_ms?: number;
      end_ms?: number;
    }) => {
      const { data, error } = await supabase
        .from('transcript_analysis')
        .insert({
          session_id: input?.session_id ?? '',
          line_order: input?.line_order ?? 0,
          speaker: input?.speaker ?? 'Muhatap',
          // Fallback: transcript || 'Kayıt bulunamadı'
          transcript: input?.transcript || 'Kayıt bulunamadı',
          sentiment: input?.sentiment ?? 'Nötr',
          confidence: input?.confidence ?? 0.75,
          ai_flag: input?.ai_flag ?? null,
          ai_note: input?.ai_note ?? null,
          keywords: input?.keywords ?? [],
          start_ms: input?.start_ms ?? 0,
          end_ms: input?.end_ms ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TranscriptLine;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...TRANSCRIPT_KEY, data?.session_id] });
    },
  });
}

/**
 * Oturum durumunu günceller
 */
export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: SessionStatus;
      overall_sentiment?: SentimentType;
      ai_risk_score?: number;
      ended_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .update({
          status: input?.status,
          overall_sentiment: input?.overall_sentiment,
          ai_risk_score: input?.ai_risk_score,
          ended_at: input?.ended_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data as InterviewSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    },
  });
}
