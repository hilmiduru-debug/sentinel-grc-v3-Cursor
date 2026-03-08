/**
 * SENTINEL GRC v3.0 — Strateji-ltree Bağlantısı: Supabase API
 * =============================================================
 * GIAS 2025 Standard IV — Stratejik Uyum
 *
 * corporate_goals (strategic_bank_goals) tablosundan Supabase ile veri çeker
 * ve her hedefe bağlı ltree universe node'larını ilişkilendirir.
 *
 * FSD Mimarisi: entities/strategy/api içinde yer alır.
 */

import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ─── Tür Tanımları ─────────────────────────────────────────────────────────────

export type RiskAppetite = 'Low' | 'Medium' | 'High';

export interface StrategicGoalDB {
 id: string;
 tenant_id: string;
 title: string;
 description: string | null;
 owner: string | null;
 period_year: number;
 weight: number;
 progress: number;
 risk_appetite: RiskAppetite;
 status: string | null;
 // ltree universe bağlantısı
 linked_universe_path: string | null;
 universe_node_id: string | null;
 // İlişkili audit objectives sayısı (join veya count)
 objective_count?: number;
 created_at: string;
 updated_at: string | null;
}

export interface AuditObjectiveDB {
 id: string;
 tenant_id: string;
 title: string;
 description: string | null;
 goal_id: string | null;
 engagement_id: string | null;
 status: string;
 priority: string;
 linked_universe_path: string | null;
 universe_node_id: string | null;
 created_at: string;
}

export interface CreateGoalInput {
 title: string;
 description?: string;
 owner?: string;
 period_year: number;
 weight?: number;
 risk_appetite?: RiskAppetite;
 linked_universe_path?: string;
 universe_node_id?: string;
}

export interface LinkGoalToUniverseInput {
 goal_id: string;
 universe_node_id: string;
 linked_universe_path: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────────

const KEYS = {
 goals: (year: number) => ['strategic-goals', year] as const,
 goal: (id: string) => ['strategic-goal', id] as const,
 objectives: ['audit-objectives'] as const,
 alignmentMap: (goalId: string) => ['goal-alignment-map', goalId] as const,
};

// ─── Stratejik Hedefleri Supabase'den Çek ────────────────────────────────────

export async function fetchStrategicGoalsDB(year?: number): Promise<StrategicGoalDB[]> {
 let query = supabase
 .from('strategic_bank_goals')
 .select('*')
 .order('weight', { ascending: false });

 if (year) {
 query = query.eq('period_year', year);
 }

 const { data, error } = await query;
 if (error) {
 console.error('[SENTINEL][Strategy] Stratejik hedefler yüklenemedi:', error);
 throw error;
 }

 return (data ?? []) as StrategicGoalDB[];
}

export function useStrategicGoals(year = new Date().getFullYear()) {
 return useQuery({
 queryKey: KEYS.goals(year),
 queryFn: () => fetchStrategicGoalsDB(year),
 staleTime: 30_000,
 });
}

// ─── Tek Hedef ────────────────────────────────────────────────────────────────

export async function fetchStrategicGoal(id: string): Promise<StrategicGoalDB | null> {
 const { data, error } = await supabase
 .from('strategic_bank_goals')
 .select('*')
 .eq('id', id)
 .maybeSingle();

 if (error) {
 console.error('[SENTINEL][Strategy] Hedef yüklenemedi:', error);
 throw error;
 }

 return data as StrategicGoalDB | null;
}

export function useStrategicGoal(id: string | null) {
 return useQuery({
 queryKey: KEYS.goal(id ?? ''),
 enabled: !!id,
 queryFn: () => fetchStrategicGoal(id!),
 });
}

// ─── Denetim Hedefleri (Audit Objectives) ────────────────────────────────────

export async function fetchAuditObjectivesDB(): Promise<AuditObjectiveDB[]> {
 const { data, error } = await supabase
 .from('strategic_audit_objectives')
 .select('*')
 .order('created_at', { ascending: false });

 if (error) {
 console.error('[SENTINEL][Strategy] Denetim hedefleri yüklenemedi:', error);
 throw error;
 }

 return (data ?? []) as AuditObjectiveDB[];
}

export function useAuditObjectives() {
 return useQuery({
 queryKey: KEYS.objectives,
 queryFn: fetchAuditObjectivesDB,
 staleTime: 60_000,
 });
}

// ─── Hedef Oluşturma ──────────────────────────────────────────────────────────

export async function createStrategicGoal(input: CreateGoalInput): Promise<StrategicGoalDB> {
 const payload = {
 title: input.title,
 description: input?.description ?? null,
 owner: input?.owner ?? null,
 period_year: input.period_year,
 weight: input?.weight ?? 10,
 progress: 0,
 risk_appetite: input?.risk_appetite ?? 'Medium',
 status: 'ACTIVE',
 linked_universe_path: input?.linked_universe_path ?? null,
 universe_node_id: input?.universe_node_id ?? null,
 tenant_id: '11111111-1111-1111-1111-111111111111',
 };

 const { data, error } = await supabase
 .from('strategic_bank_goals')
 .insert(payload)
 .select()
 .single();

 if (error) {
 console.error('[SENTINEL][Strategy] Hedef oluşturulamadı:', error);
 throw error;
 }

 return data as StrategicGoalDB;
}

export function useCreateStrategicGoal() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: createStrategicGoal,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['strategic-goals'] });
 toast.success('Stratejik hedef oluşturuldu ✓');
 },
 onError: (err) => {
 const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
 toast.error(`Hedef oluşturulamadı: ${msg}`);
 },
 });
}

// ─── Hedef ↔ Universe Node Bağlantısı ────────────────────────────────────────

export async function linkGoalToUniverse(input: LinkGoalToUniverseInput): Promise<void> {
 const { error } = await supabase
 .from('strategic_bank_goals')
 .update({
 universe_node_id: input.universe_node_id,
 linked_universe_path: input.linked_universe_path,
 })
 .eq('id', input.goal_id);

 if (error) {
 console.error('[SENTINEL][Strategy] Universe bağlantısı kurulamadı:', error);
 throw error;
 }
}

export function useLinkGoalToUniverse() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: linkGoalToUniverse,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['strategic-goals'] });
 toast.success('Stratejik hedef denetim evreni noduna bağlandı ✓', {
 icon: '🌳',
 });
 },
 onError: (err) => {
 const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
 console.error('[SENTINEL][Strategy] useLinkGoalToUniverse error:', err);
 toast.error(`Bağlantı kurulamadı: ${msg}`);
 },
 });
}

// ─── Universe Noduna Ait Hedefler ─────────────────────────────────────────────
// ltree path ile strateji hedeflerini filtrele (partial match: LIKE 'path%')

export async function fetchGoalsByUniversePath(path: string): Promise<StrategicGoalDB[]> {
 if (!path?.trim()) return [];

 const { data, error } = await supabase
 .from('strategic_bank_goals')
 .select('*')
 .or(`linked_universe_path.eq.${path},linked_universe_path.like.${path}.%`)
 .order('weight', { ascending: false });

 if (error) {
 console.error('[SENTINEL][Strategy] Universe path hedefleri yüklenemedi:', error);
 throw error;
 }

 return (data ?? []) as StrategicGoalDB[];
}

export function useGoalsByUniversePath(path: string | null) {
 return useQuery({
 queryKey: ['goals-by-universe-path', path ?? ''],
 enabled: !!path,
 queryFn: () => fetchGoalsByUniversePath(path!),
 staleTime: 30_000,
 });
}
