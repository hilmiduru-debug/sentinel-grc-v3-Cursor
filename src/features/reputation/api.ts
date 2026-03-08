/**
 * Reputational Risk & Sentiment Oracle — Veri Katmanı
 * features/reputation/api.ts (Wave 73)
 *
 * Çökme Kalkanları:
 * (feeds || []).map(...) → boş dizi kalkanı
 * (total_mentions || 1) → sıfıra bölünme koruması
 * 42P01 → graceful boş dizi/null
 */

import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ─── Tipler ──────────────────────────────────────────────────────────────────

export type SentimentType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'TOXIC';
export type PlatformType = 'X' | 'LINKEDIN' | 'NEWS' | 'FORUM' | 'APP_STORES' | 'OTHER';
export type CrisisSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type CrisisStatus = 'MONITORING' | 'PR_RESPONSE_REQUIRED' | 'MITIGATED' | 'FALSE_ALARM';

export interface SentimentFeed {
 id: string;
 source_platform: PlatformType;
 post_id: string | null;
 author_handle: string | null;
 content_snippet: string;
 published_at: string;
 sentiment_type: SentimentType;
 sentiment_score: number;
 impact_reach: number;
 target_entity: string | null;
 is_flagged: boolean;
 created_at: string;
}

export interface CrisisAlert {
 id: string;
 alert_title: string;
 alert_date: string;
 severity: CrisisSeverity;
 negative_ratio_pct: number;
 total_mentions: number;
 crisis_topic: string;
 action_plan: string | null;
 status: CrisisStatus;
 assigned_to: string | null;
}

export interface ReputationKPI {
 totalFeeds: number;
 avgSentimentScore: number;
 totalNegativeMentions: number;
 activeCrises: number;
 overallHealthPct: number;
 totalReach: number;
}

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

export function formatCompact(amount: number | null | undefined): string {
 if (!amount) return '0';
 if (amount >= 1e6) return (amount / 1e6).toFixed(1) + 'M';
 if (amount >= 1e3) return (amount / 1e3).toFixed(1) + 'K';
 return amount.toString();
}

// ─── Hook: useSentimentFeeds ──────────────────────────────────────────────────

export function useSentimentFeeds(filters?: { type?: string; limit?: number }) {
 return useQuery<SentimentFeed[]>({
 queryKey: ['sentiment-feeds', filters],
 queryFn: async () => {
 let q = supabase
 .from('social_sentiment_feeds')
 .select('*')
 .order('published_at', { ascending: false });

 if (filters?.type && filters.type !== 'ALL') {
 q = q.eq('sentiment_type', filters.type);
 }
 if (filters?.limit) q = q.limit(filters.limit);
 else q = q.limit(100);

 const { data, error } = await q;
 if (error) {
 if (error.code === '42P01') return [];
 throw error;
 }

 // (feeds || []).map kalkanı
 return (data || []).map((row: any) => ({
 ...row,
 sentiment_score: Number(row.sentiment_score || 0),
 impact_reach: Number(row.impact_reach || 0),
 })) as SentimentFeed[];
 },
 // Sosyal medya akışı canlı veridir
 staleTime: 1000 * 30,
 refetchInterval: 15000,
 });
}

// ─── Hook: useCrisisAlerts ────────────────────────────────────────────────────

export function useCrisisAlerts(status?: string) {
 return useQuery<CrisisAlert[]>({
 queryKey: ['crisis-alerts', status],
 queryFn: async () => {
 let q = supabase
 .from('reputation_crisis_alerts')
 .select('*')
 .order('alert_date', { ascending: false });

 if (status && status !== 'ALL') q = q.eq('status', status);

 const { data, error } = await q;
 if (error) {
 if (error.code === '42P01') return [];
 throw error;
 }

 return (data || []).map((r: any) => ({
 ...r,
 negative_ratio_pct: Number(r.negative_ratio_pct || 0),
 total_mentions: Number(r.total_mentions || 0),
 })) as CrisisAlert[];
 },
 staleTime: 1000 * 60,
 });
}

// ─── Hook: useReputationKPI ───────────────────────────────────────────────────

export function useReputationKPI(feeds: SentimentFeed[], alerts: CrisisAlert[]): ReputationKPI {
 const safeFeeds = feeds || [];
 const safeAlerts = alerts || [];

 const totalFeeds = safeFeeds.length;
 // SIFIRA BÖLÜNME KORUMASI KESİNLİKLE YAPILDI (totalFeeds || 1)
 const safeDivisor = totalFeeds || 1;
 
 const totalScoreSum = (safeFeeds || []).reduce((sum, f) => sum + (f.sentiment_score || 0), 0);
 const avgSentimentScore = Math.round(totalScoreSum / safeDivisor);

 const negativeFeeds = (safeFeeds || []).filter(f => f.sentiment_type === 'NEGATIVE' || f.sentiment_type === 'TOXIC');
 const totalNegativeMentions = negativeFeeds.length;
 
 // Health Pct (Positive/Neutral / Total)
 const goodFeeds = totalFeeds - totalNegativeMentions;
 const overallHealthPct = Math.round((goodFeeds / safeDivisor) * 100);

 const totalReach = (safeFeeds || []).reduce((sum, f) => sum + (f.impact_reach || 0), 0);
 const activeCrises = (safeAlerts || []).filter(a => a.status === 'MONITORING' || a.status === 'PR_RESPONSE_REQUIRED').length;

 return {
 totalFeeds,
 avgSentimentScore,
 totalNegativeMentions,
 activeCrises,
 overallHealthPct,
 totalReach
 };
}

// ─── Hook: useUpdateCrisisStatus ──────────────────────────────────────────────

export function useUpdateCrisisStatus() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async ({ id, status, plan }: { id: string; status: CrisisStatus; plan?: string }) => {
 const payload: any = { status, updated_at: new Date().toISOString() };
 if (plan) payload.action_plan = plan;

 const { error } = await supabase
 .from('reputation_crisis_alerts')
 .update(payload)
 .eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => {
 void qc.invalidateQueries({ queryKey: ['crisis-alerts'] });
 toast.success('Kriz alarm statüsü güncellendi.');
 },
 onError: (err: Error) => toast.error(`Güncelleme başarısız: ${err.message}`),
 });
}
