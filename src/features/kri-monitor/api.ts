/**
 * Wave 49: Dynamic Risk Appetite & KRI Monitor — API Kancaları
 *
 * Tablolar: risk_appetite_limits, kri_readings
 *
 * ZORUNLU KURALLAR:
 * - Tüm nullable alanlarda  ?.  ve  ??  kullanımı
 * - Array map'lerinde  (data || []).map(...)
 * - Gauge hesaplarında  (limit_threshold - target_value || 1)  sıfıra bölünme koruması
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const APPETITE_KEY = ['risk-appetite-limits'] as const;
const KRI_KEY      = ['kri-readings'] as const;

/* ────────────────────────────────────────────────────────── */
/* Types                                                       */
/* ────────────────────────────────────────────────────────── */

export type KRICategory  = 'CREDIT' | 'LIQUIDITY' | 'OPERATIONAL' | 'MARKET' | 'COMPLIANCE' | 'CYBER';
export type KRIDirection = 'LOWER_IS_BETTER' | 'HIGHER_IS_BETTER';
export type KRIStatus    = 'NORMAL' | 'WARNING' | 'BREACH' | 'CRITICAL';

export interface RiskAppetiteLimit {
  id: string;
  kri_code: string;
  kri_name: string;
  description: string;
  category: KRICategory;
  unit: string;
  target_value: number;
  warning_threshold: number;
  limit_threshold: number;
  direction: KRIDirection;
  is_active: boolean;
  regulatory_ref: string | null;
}

export interface KRIReading {
  id: string;
  appetite_id: string;
  kri_code: string;
  reading_value: number;
  status: KRIStatus;
  note: string | null;
  measured_by: string;
  measured_at: string;
}

export interface KRIWithLatest extends RiskAppetiteLimit {
  latest_reading: KRIReading | null;
  /** Gauge için 0–100 pozisyon (sıfıra bölünme korumalı) */
  gauge_pct: number;
  breach: boolean;
  warning: boolean;
}

/* ────────────────────────────────────────────────────────── */
/* Gauge hesaplama (sıfıra bölünme korumalı)                  */
/* ────────────────────────────────────────────────────────── */

function computeGaugePct(limit: RiskAppetiteLimit, value: number): number {
  const { target_value, limit_threshold, direction, warning_threshold } = limit;

  if (direction === 'LOWER_IS_BETTER') {
    // 0% = target, 100% = limit veya üstü
    const range = (limit_threshold - target_value) || 1; // sıfıra bölünme koruması
    return Math.min(100, Math.max(0, Math.round(((value - target_value) / range) * 100)));
  } else {
    // HIGHER_IS_BETTER: 0% = limit veya altı, 100% = target veya üstü
    const range = (target_value - limit_threshold) || 1; // sıfıra bölünme koruması
    return Math.min(100, Math.max(0, Math.round(((value - limit_threshold) / range) * 100)));
  }
}

function computeStatus(limit: RiskAppetiteLimit, value: number): { breach: boolean; warning: boolean } {
  const { warning_threshold, limit_threshold, direction } = limit;

  if (direction === 'LOWER_IS_BETTER') {
    return {
      breach:  value >= limit_threshold,
      warning: value >= warning_threshold && value < limit_threshold,
    };
  } else {
    return {
      breach:  value <= limit_threshold,
      warning: value <= warning_threshold && value > limit_threshold,
    };
  }
}

/* ────────────────────────────────────────────────────────── */
/* Queries                                                     */
/* ────────────────────────────────────────────────────────── */

/** Tüm risk iştahı limitlerini çeker */
export function useAppetiteLimits() {
  return useQuery<RiskAppetiteLimit[]>({
    queryKey: APPETITE_KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_appetite_limits')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) {
        console.error('[KRIMonitor] useAppetiteLimits error:', error.message);
        throw error;
      }
      return (data ?? []) as RiskAppetiteLimit[];
    },
  });
}

/** Her KRI'nin en son okumasını çeker */
export function useKRIReadings() {
  return useQuery<KRIReading[]>({
    queryKey: KRI_KEY,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kri_readings')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('measured_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[KRIMonitor] useKRIReadings error:', error.message);
        throw error;
      }
      return (data ?? []) as KRIReading[];
    },
  });
}

/**
 * KRI limitlerini en son okumayla ve gauge yüzdesiyle birleştirir.
 * Tüm ?.  ve  ??  korumaları uygulanmıştır.
 */
export function useKRIBoard(): { data: KRIWithLatest[]; isLoading: boolean; isError: boolean; hasBreaches: boolean } {
  const { data: limits = [], isLoading: lLoad, isError: lErr } = useAppetiteLimits();
  const { data: readings = [], isLoading: rLoad, isError: rErr } = useKRIReadings();

  const data: KRIWithLatest[] = (limits || []).map((limit) => {
    // Bu limit'e ait okumalar (kri_code'a göre)
    const limitReadings = (readings || []).filter(r => r?.kri_code === limit?.kri_code);
    const latest_reading = limitReadings[0] ?? null;  // en yeni (DESC sıralı)
    const value = latest_reading?.reading_value ?? limit?.target_value ?? 0;

    const gauge_pct = computeGaugePct(limit, value);
    const { breach, warning } = computeStatus(limit, value);

    return {
      ...limit,
      latest_reading,
      gauge_pct,
      breach,
      warning,
    };
  });

  const hasBreaches = data.some(d => d.breach);

  return {
    data,
    isLoading: lLoad || rLoad,
    isError:   lErr  || rErr,
    hasBreaches,
  };
}
