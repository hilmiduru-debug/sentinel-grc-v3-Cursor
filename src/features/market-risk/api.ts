/**
 * Algo-Trading & Flash Crash Sentinel — Veri Katmanı
 * features/market-risk/api.ts  (Wave 63)
 *
 * Çökme Kalkanları:
 *   (logs || []).map(...)      → boş dizi kalkanı
 *   (volume || 1)              → sıfıra bölünme koruması
 *   42P01 → graceful boş dizi/null
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import toast from 'react-hot-toast';

// ─── Tipler ──────────────────────────────────────────────────────────────────

export type OrderType = 'LIMIT' | 'MARKET' | 'STOP' | 'ICEBERG' | 'FAK' | 'FOK';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'OPEN' | 'INVESTIGATING' | 'FALSE_POSITIVE' | 'REPORTED_TO_REGULATOR' | 'RESOLVED';

export interface AlgoLog {
  id: string;
  trade_code: string;
  desk: string;
  instrument: string;
  order_type: OrderType;
  side: 'BUY' | 'SELL';
  price: number;
  volume: number;
  algo_strategy_id: string | null;
  execution_ms: number;
  is_canceled: boolean;
  timestamp: string;
}

export interface MarketRiskAlert {
  id: string;
  alert_code: string;
  detection_time: string;
  anomaly_type: string;
  instrument: string;
  severity: AlertSeverity;
  description: string;
  affected_volume: number;
  triggering_algo: string | null;
  status: AlertStatus;
  investigator: string | null;
  resolution_notes: string | null;
}

export interface MarketRiskKPI {
  totalVoumeUSD: number;
  avgLatencyMs: number;
  criticalAlerts: number;
  canceledOrderRatio: number;
  spoofingCount: number;
}

export function formatUSD(amount: number | null | undefined): string {
  return (amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// ─── Hook: useAlgoLogs ────────────────────────────────────────────────────────

export function useAlgoLogs(filters?: { instrument?: string; limit?: number }) {
  return useQuery<AlgoLog[]>({
    queryKey: ['algo-logs', filters],
    queryFn: async () => {
      let q = supabase
        .from('algo_trading_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters?.instrument) q = q.eq('instrument', filters.instrument);
      if (filters?.limit)      q = q.limit(filters.limit);
      else                     q = q.limit(200);

      const { data, error } = await q;
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }

      // (logs || []).map kalkanı
      return (data || []).map((row: any) => ({
        ...row,
        price: Number(row.price || 0),
        volume: Number(row.volume || 0),
        execution_ms: Number(row.execution_ms || 0),
      })) as AlgoLog[];
    },
    // HFT logları sık değişebileceği için cache süresi kısa tutulur
    staleTime: 1000 * 30,
    // Polling aktif edilebilir (örneğin 15 saniyede bir)
    refetchInterval: 15000,
  });
}

// ─── Hook: useMarketAlerts ────────────────────────────────────────────────────

export function useMarketAlerts(status?: string) {
  return useQuery<MarketRiskAlert[]>({
    queryKey: ['market-alerts', status],
    queryFn: async () => {
      let q = supabase
        .from('market_manipulation_alerts')
        .select('*')
        .order('detection_time', { ascending: false });

      if (status && status !== 'ALL') q = q.eq('status', status);

      const { data, error } = await q;
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }

      return (data || []).map((r: any) => ({
        ...r,
        affected_volume: Number(r.affected_volume || 0),
      })) as MarketRiskAlert[];
    },
    staleTime: 1000 * 60,
  });
}

// ─── Hook: useMarketRiskKPI ───────────────────────────────────────────────────

export function useMarketRiskKPI(logs: AlgoLog[], alerts: MarketRiskAlert[]): MarketRiskKPI {
  const safeLogs = logs || [];
  const safeAlerts = alerts || [];

  const totalOrders = safeLogs.length;
  // Volume sum 
  const totalVolume = safeLogs.reduce((sum, l) => sum + (l.volume || 0), 0);
  
  // Latency avg with zero-division protection
  const totalLatency = safeLogs.reduce((sum, l) => sum + (l.execution_ms || 0), 0);
  const avgLatencyMs = Math.round(totalLatency / (totalOrders || 1));

  // Canceled ratio with zero-division protection
  const canceledCount = safeLogs.filter(l => l.is_canceled).length;
  const canceledOrderRatio = Math.round((canceledCount / (totalOrders || 1)) * 100);

  const criticalAlerts = safeAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;
  const spoofingCount = safeAlerts.filter(a => a.anomaly_type === 'SPOOFING').length;

  return {
    totalVoumeUSD: totalVolume,
    avgLatencyMs,
    criticalAlerts,
    canceledOrderRatio,
    spoofingCount,
  };
}

// ─── Hook: useUpdateAlertStatus ───────────────────────────────────────────────

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: AlertStatus; notes?: string }) => {
      const payload: any = { status, updated_at: new Date().toISOString() };
      if (notes) payload.resolution_notes = notes;

      const { error } = await supabase
        .from('market_manipulation_alerts')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['market-alerts'] });
      toast.success('Alarm durumu güncellendi.');
    },
    onError: (err: Error) => toast.error(`Güncelleme başarısız: ${err.message}`),
  });
}
