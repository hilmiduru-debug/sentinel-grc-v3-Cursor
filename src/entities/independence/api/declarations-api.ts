/**
 * SENTINEL GRC v3.0 — Iron Gate: Bağımsızlık Beyanı API Katmanı
 * ================================================================
 * GIAS 2025 Standard II.1 — Bağımsızlık ve Tarafsızlık
 *
 * Bu katman:
 *  - Supabase `auditor_declarations` tablosunu sorgular
 *  - Engagement bazlı beyan durumunu (MISSING/PENDING/SIGNED) döner
 *  - Beyan imzalama (upsert) ve iron gate bypass mantığını yönetir
 *
 * FSD Mimarisi: entities/independence/api içinde yer alır.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import toast from 'react-hot-toast';

// ─── Tür Tanımları ─────────────────────────────────────────────────────────────

export type GateStatus = 'MISSING' | 'PENDING' | 'SIGNED';

export interface AuditorDeclaration {
  id: string;
  user_id: string;
  engagement_id: string | null;
  entity_id: string | null;
  declaration_type: 'INDEPENDENCE' | 'CONFLICT_OF_INTEREST' | 'CODE_OF_CONDUCT';
  period_year: number;
  has_conflict: boolean;
  conflict_description: string | null;
  declaration_text: string | null;
  signed_at: string | null;
  signature_hash: string | null;
  tenant_id: string;
  created_at: string;
}

export interface EngagementGateResult {
  gate_status: GateStatus;
  declaration: AuditorDeclaration | null;
}

export interface SignDeclarationInput {
  engagement_id: string;
  user_id: string;
  entity_id?: string;
  has_conflict: boolean;
  conflict_description?: string;
  declaration_text: string;
  tenant_id?: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────────

const KEYS = {
  gate: (engagementId: string, userId: string) =>
    ['iron-gate', engagementId, userId] as const,
  userDeclarations: (userId: string, year: number) =>
    ['declarations', userId, year] as const,
};

// ─── Engament İçin Iron Gate Durumu ───────────────────────────────────────────

export async function fetchEngagementGateStatus(
  engagementId: string,
  userId: string,
): Promise<EngagementGateResult> {
  const { data, error } = await supabase
    .from('auditor_declarations')
    .select('*')
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .eq('declaration_type', 'INDEPENDENCE')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[SENTINEL][IronGate] Beyan sorgusu başarısız:', error);
    throw error;
  }

  const declaration = data as AuditorDeclaration | null;

  let gate_status: GateStatus = 'MISSING';
  if (declaration) {
    gate_status = declaration?.signed_at ? 'SIGNED' : 'PENDING';
  }

  return { gate_status, declaration };
}

export function useEngagementGateStatus(
  engagementId: string | null,
  userId: string | null,
) {
  return useQuery({
    queryKey: KEYS.gate(engagementId ?? '', userId ?? ''),
    enabled: !!engagementId && !!userId,
    queryFn: () => fetchEngagementGateStatus(engagementId!, userId!),
    staleTime: 0, // Her engagement açılışında taze veri
    retry: 2,
  });
}

// ─── Beyan İmzalama (Upsert) ──────────────────────────────────────────────────

export async function signDeclaration(input: SignDeclarationInput): Promise<AuditorDeclaration> {
  const periodYear = new Date().getFullYear();

  // Signature hash: SHA-256 yerine basit deterministik hash (Edge Function gerektirmez)
  const raw = `${input.user_id}|${input.engagement_id}|${Date.now()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature_hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const payload = {
    user_id: input.user_id,
    engagement_id: input.engagement_id,
    entity_id: input?.entity_id ?? null,
    declaration_type: 'INDEPENDENCE' as const,
    period_year: periodYear,
    has_conflict: input.has_conflict ?? false,
    conflict_description: input?.conflict_description ?? null,
    declaration_text: input.declaration_text,
    signed_at: new Date().toISOString(),
    signature_hash,
    tenant_id: input?.tenant_id ?? '11111111-1111-1111-1111-111111111111',
  };

  const { data: result, error } = await supabase
    .from('auditor_declarations')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[SENTINEL][IronGate] Beyan imzalanamadı:', error);
    throw error;
  }

  return result as AuditorDeclaration;
}

export function useSignDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SignDeclarationInput) => signDeclaration(input),
    onSuccess: (data) => {
      // Ilgili gate cache'ini invalidate et
      queryClient.invalidateQueries({
        queryKey: ['iron-gate'],
      });
      toast.success('Bağımsızlık beyanı başarıyla imzalandı ✓', {
        duration: 4000,
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #334155',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
        icon: '🔐',
      });
      return data;
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Bilinmeyen veritabanı hatası';
      console.error('[SENTINEL][IronGate] useMutation error:', error);
      toast.error(`Beyan imzalanamadı: ${msg}`, {
        duration: 6000,
        style: {
          background: '#7f1d1d',
          color: '#fef2f2',
          border: '1px solid #991b1b',
        },
      });
    },
  });
}

// ─── Kullanıcı Yıllık Beyan Özetleri ─────────────────────────────────────────

export async function fetchUserDeclarations(
  userId: string,
  year: number,
): Promise<AuditorDeclaration[]> {
  const { data, error } = await supabase
    .from('auditor_declarations')
    .select('*')
    .eq('user_id', userId)
    .eq('period_year', year)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SENTINEL][IronGate] Kullanıcı beyanları sorgusu başarısız:', error);
    throw error;
  }

  return (data ?? []) as AuditorDeclaration[];
}

export function useUserDeclarations(userId: string | null, year = new Date().getFullYear()) {
  return useQuery({
    queryKey: KEYS.userDeclarations(userId ?? '', year),
    enabled: !!userId,
    queryFn: () => fetchUserDeclarations(userId!, year),
    staleTime: 60_000,
  });
}
