/**
 * Executive Remuneration & Clawback Tracker API
 * Wave 65: Üst Yönetim Ücretlendirme İzleyicisi
 *
 * FSD: features/remuneration/api.ts
 * Savunmacı Programlama: (bonuses || []).map ve bonus?.amount ?? 0 korumaları
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PerformanceRating = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'C-' | 'D';
export type BonusStatus       = 'Taslak' | 'Tahakkuk Edildi' | 'Kısmen Ödendi' | 'Ödendi' | 'İptal Edildi (Clawback)';
export type RecoveryStatus    = 'İncelemede' | 'Karara Bağlandı' | 'Tahsil Edildi' | 'Hukuki Süreçte';

export interface ExecutiveBonus {
  id: string;
  tenant_id: string;
  executive_name: string;
  title: string;
  department: string;
  performance_year: number;
  base_salary: number | null;
  target_bonus: number | null;
  awarded_bonus: number | null;
  deferred_amount: number | null;
  vesting_date: string | null;
  risk_adjusted_rating: PerformanceRating;
  status: BonusStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClawbackEvent {
  id: string;
  tenant_id: string;
  bonus_id: string;
  trigger_event: string;
  trigger_date: string;
  clawback_amount: number;
  justification: string;
  board_resolution_ref: string | null;
  recovery_status: RecoveryStatus;
  created_at: string;
  updated_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

const BONUS_KEY    = ['executive-bonuses'] as const;
const CLAWBACK_KEY = ['clawback-events'] as const;

// ─── Executive Bonuses Hooks ──────────────────────────────────────────────────

/**
 * Tüm yönetici primlerini listeler.
 * Güçlü boşluk koruması (data || []).map ve sayısal nullish coalescing (?? 0) içerir.
 */
export function useBonuses(year?: number) {
  return useQuery({
    queryKey: [...BONUS_KEY, year ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('executive_bonuses')
        .select('*')
        .order('awarded_bonus', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (year) query = query.eq('performance_year', year);

      const { data, error } = await query;
      if (error) {
        console.error('[Wave65] Failed to fetch executive_bonuses:', error);
        return [] as ExecutiveBonus[];
      }
      
      // Null Koruması: Bütün sayısal değerlere ?? 0 kalkanı uygulanır
      return ((data as any[]) || []).map(b => ({
        ...b,
        base_salary:     b?.base_salary     ?? 0,
        target_bonus:    b?.target_bonus    ?? 0,
        awarded_bonus:   b?.awarded_bonus   ?? 0,
        deferred_amount: b?.deferred_amount ?? 0,
      })) as ExecutiveBonus[];
    },
    staleTime: 30_000,
  });
}

/**
 * Yeni prim tahakkuku kaydı açar
 */
export function useCreateBonus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      executive_name: string;
      title: string;
      department: string;
      performance_year: number;
      base_salary?: number;
      target_bonus?: number;
      awarded_bonus?: number;
      deferred_amount?: number;
      risk_adjusted_rating?: PerformanceRating;
    }) => {
      const { data, error } = await supabase
        .from('executive_bonuses')
        .insert({
          executive_name:       input?.executive_name       ?? '',
          title:                input?.title                ?? '',
          department:           input?.department           ?? '',
          performance_year:     input?.performance_year     ?? new Date().getFullYear(),
          base_salary:          input?.base_salary          ?? 0,
          target_bonus:         input?.target_bonus         ?? 0,
          awarded_bonus:        input?.awarded_bonus        ?? 0,
          deferred_amount:      input?.deferred_amount      ?? 0,
          risk_adjusted_rating: input?.risk_adjusted_rating ?? 'B',
          status:               'Tahakkuk Edildi',
        })
        .select()
        .single();

      if (error) throw error;
      return data as ExecutiveBonus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BONUS_KEY });
    },
  });
}

// ─── Clawback Hooks ───────────────────────────────────────────────────────────

/**
 * Belirli bir prime uygulanan geri çağırma (clawback / malus) olaylarını getirir.
 */
export function useClawbacks(bonusId: string | undefined) {
  return useQuery({
    queryKey: [...CLAWBACK_KEY, bonusId],
    enabled: !!bonusId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clawback_events')
        .select('*')
        .eq('bonus_id', bonusId!)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Wave65] Failed to fetch clawback_events:', error);
        return [] as ClawbackEvent[];
      }
      
      // Null Koruması: Sayısal alan
      return ((data as any[]) || []).map(cb => ({
        ...cb,
        clawback_amount: cb?.clawback_amount ?? 0,
      })) as ClawbackEvent[];
    },
    staleTime: 15_000,
  });
}
