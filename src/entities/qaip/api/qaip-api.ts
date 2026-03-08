/**
 * SENTINEL GRC v3.0 — Auto-QAIP Engine: Supabase API Katmanı
 * ============================================================
 * GIAS 2025 Standard 12.1 — Kalite Güvence ve İyileştirme Programı
 *
 * Bu katman entities/qaip/api/ altında yer alır (FSD mimarisi).
 * Tüm sorgular gerçek Supabase tablolarına karşı çalışır:
 *   - audit_findings  → Kanıt Eksikliği Oranı
 *   - workpapers      → 4-Göz Prensibi
 *   - action_plans    → Gecikmiş Aksiyonlar
 *   - qaip_checklists → Checklist yönetimi
 *   - qaip_reviews    → Review yönetimi
 *
 * GIAS 2025 Metrikleri (Ağırlıklar):
 *   Kanıt Eksikliği Oranı : %35
 *   4-Göz Prensibi        : %35
 *   Gecikmiş Aksiyonlar   : %30
 *
 * AŞIRI SAVUNMACI PROGRAMLAMA:
 *   - Her matematiksel işlemde (x || 1) bölme güvencesi — NaN önlemi
 *   - Optional chaining (?.) ile tüm veri erişimleri
 *   - Nullish coalescing (??) ile tüm değer atamaları
 *   - Math.max(0, Math.min(100, ...)) ile skor sınırlandırma
 */

import { supabase } from '@/shared/api/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ─── Tür Tanımları ─────────────────────────────────────────────────────────────

export interface QaipChecklist {
    id: string;
    title: string;
    description: string | null;
    criteria: QaipCriterion[];
    tenant_id: string;
    created_at: string;
    updated_at: string | null;
}

export interface QaipCriterion {
    id: string;
    label: string;
    weight: number;
    required: boolean;
    description?: string;
}

export interface QaipReview {
    id: string;
    engagement_id: string | null;
    reviewer_id: string | null;
    checklist_id: string | null;
    results: Record<string, number | boolean>;
    total_score: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
    notes: string | null;
    completed_at: string | null;
    created_at: string;
}

export interface QaipHealthScore {
    overall: number;           // 0-100
    zone: 'GREEN' | 'YELLOW' | 'RED'; // 85+ GREEN, 70-84 YELLOW, <70 RED
    components: QaipHealthComponent[];
    passesGate: boolean;
    source: 'REALTIME' | 'CACHED'; // Supabase vs lokal hesap
    computed_at: string;
}

export interface QaipHealthComponent {
    key: string;
    label: string;
    score: number;       // 0-100
    weight: number;      // 0-1
    weighted: number;
    gap: string;
    raw_total: number;
    raw_passing: number;
}

export interface QaipStatsInput {
    engagement_id?: string;
    tenant_id?: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const QAIP_KEYS = {
    checklists: ['qaip-checklists'] as const,
    checklist: (id: string) => ['qaip-checklist', id] as const,
    reviews: (engagementId?: string) => ['qaip-reviews', engagementId ?? 'all'] as const,
    healthScore: (input: QaipStatsInput) => ['qaip-health', JSON.stringify(input)] as const,
};

// ─── QAIP Checklist: Sorgulama ────────────────────────────────────────────────

export async function fetchQaipChecklists(): Promise<QaipChecklist[]> {
    const { data, error } = await supabase
        .from('qaip_checklists')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[SENTINEL][QAIP] Checklist sorgulama başarısız:', error);
        throw error;
    }
    return ((data ?? []) as QaipChecklist[]).map((c) => ({
        ...c,
        criteria: Array.isArray(c.criteria) ? c.criteria : [],
    }));
}

export function useQaipChecklists() {
    return useQuery({
        queryKey: QAIP_KEYS.checklists,
        queryFn: fetchQaipChecklists,
        staleTime: 60_000,
    });
}

// ─── QAIP Reviews: Sorgulama ──────────────────────────────────────────────────

export async function fetchQaipReviews(engagementId?: string): Promise<QaipReview[]> {
    let query = supabase
        .from('qaip_reviews')
        .select('*')
        .order('created_at', { ascending: false });

    if (engagementId) {
        query = query.eq('engagement_id', engagementId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('[SENTINEL][QAIP] Review sorgulama başarısız:', error);
        throw error;
    }
    return (data ?? []) as QaipReview[];
}

export function useQaipReviews(engagementId?: string) {
    return useQuery({
        queryKey: QAIP_KEYS.reviews(engagementId),
        queryFn: () => fetchQaipReviews(engagementId),
        staleTime: 30_000,
    });
}

// ─── Auto-QAIP: GIAS 2025 — Gerçek Supabase Verisiyle Sağlık Skoru ────────────
// GIAS 2025 Standard 12.1 — Otomatik kalite ölçümü
// 3 metrik: Kanıt Eksikliği, 4-Göz Prensibi, Gecikmiş Aksiyonlar

export async function computeQaipHealth(input: QaipStatsInput): Promise<QaipHealthScore> {
    const now = new Date().toISOString();

    // ─── Paralel Supabase Sorguları ─────────────────────────────────────────────
    // GIAS 2025 Std. 12.1 için gerekli 3 veri kümesi:
    //   1) audit_findings  → Kanıt Eksikliği Oranı  (%35)
    //   2) workpapers      → 4-Göz Prensibi          (%35)
    //   3) action_plans    → Gecikmiş Aksiyonlar      (%30)
    const [findRes, wpRes, actionRes] = await Promise.all([
        // 1) Tüm bulgular (kanıt durumu için — evidence_links alanı kontrol edilir)
        supabase
            .from('audit_findings')
            .select('id, status, evidence_links, risk_level, created_at')
            .order('created_at', { ascending: false })
            .limit(500),

        // 2) Çalışma kağıtları (4-göz için: assigned_to vs approved_by)
        supabase
            .from('workpapers')
            .select('id, status, assigned_to, approved_by, approved_at, due_date, created_at')
            .order('created_at', { ascending: false })
            .limit(500),

        // 3) Aksiyon planları (gecikmiş vadeler için)
        supabase
            .from('action_plans')
            .select('id, status, due_date, closed_at, created_at')
            .order('created_at', { ascending: false })
            .limit(500),
    ]);

    // Hataları logla — ama çökma; savunmacı devam et
    if (findRes.error) console.error('[SENTINEL][QAIP] audit_findings sorgusu hatası:', findRes.error);
    if (wpRes.error) console.error('[SENTINEL][QAIP] workpapers sorgusu hatası:', wpRes.error);
    if (actionRes.error) console.error('[SENTINEL][QAIP] action_plans sorgusu hatası:', actionRes.error);

    const findings = findRes.data ?? [];
    const workpapers = wpRes.data ?? [];
    const actions = actionRes.data ?? [];

    // ── GIAS 2025 Metrik 1: Kanıt Eksikliği Oranı (%35) ─────────────────────────
    // Formül: kanıtsız_bulgu / toplam_bulgu → ters çevrilerek skora dönüştür
    // Referans: GIAS 2025 Standard 2310 — Bulgu Belgesi
    const totalFindings = (findings || []).length;
    const findingsWithEvidence = (findings || []).filter((f) => {
        const links = f?.evidence_links;
        return Array.isArray(links) && (links?.length ?? 0) > 0;
    }).length;
    const deficientFindings = totalFindings - findingsWithEvidence;
    const evidenceScore = Math.round((findingsWithEvidence / (totalFindings || 1)) * 100);
    const evidenceGap = deficientFindings > 0
        ? `${deficientFindings} bulguda kanıt eksik — kanıtsız oranı %${Math.round((deficientFindings / (totalFindings || 1)) * 100)} (GIAS 2025 Std. 2310)`
        : '';

    const comp1: QaipHealthComponent = {
        key: 'evidence_deficiency',
        label: 'Kanıt Eksikliği Oranı',
        score: evidenceScore,
        weight: 0.35,
        weighted: Math.round(evidenceScore * 0.35),
        gap: evidenceGap,
        raw_total: totalFindings,
        raw_passing: findingsWithEvidence,
    };

    // ── GIAS 2025 Metrik 2: 4-Göz Prensibi (%35) ─────────────────────────────────
    // İhlal: onaylayan (approved_by) yok VEYA hazırlayan (assigned_to) ile aynı
    // Referans: GIAS 2025 Standard 1100 — Bağımsızlık ve Tarafsızlık
    const closedWp = (workpapers || []).filter((w) => w?.status === 'APPROVED');
    const totalClosedWp = closedWp.length;
    const fourEyesOk = closedWp.filter((w) => {
        const preparer = w?.assigned_to ?? null;
        const approver = w?.approved_by ?? null;
        // Her ikisi dolu VE birbirinden farklı → 4-göz uygulandi
        return approver !== null && preparer !== null && approver !== preparer;
    }).length;
    const fourEyesViolations = totalClosedWp - fourEyesOk;
    const fourEyesScore = Math.round((fourEyesOk / (totalClosedWp || 1)) * 100);
    const fourEyesGap = fourEyesViolations > 0
        ? `${fourEyesViolations} çalışma kağıdında 4-Göz ihlali — hazırlayan = onaylayan veya onay eksik (GIAS 2025 Std. 1100)`
        : '';

    const comp2: QaipHealthComponent = {
        key: 'four_eyes',
        label: '4-Göz Prensibi',
        score: fourEyesScore,
        weight: 0.35,
        weighted: Math.round(fourEyesScore * 0.35),
        gap: fourEyesGap,
        raw_total: totalClosedWp,
        raw_passing: fourEyesOk,
    };

    // ── GIAS 2025 Metrik 3: Gecikmiş Aksiyonlar (%30) ────────────────────────────
    // Formül: vadesi geçmiş (due_date < now) ve kapalı olmayan aksiyonlar
    // Referans: GIAS 2025 Standard 2400 — Aksiyon Yönetimi
    const totalActions = (actions || []).length;
    const overdueCount = (actions || []).filter((a) => {
        if (!a?.due_date) return false;
        const isDue = new Date(a.due_date) < new Date(now);
        const isClosed = (a?.status ?? '') === 'CLOSED' || (a?.closed_at ?? null) !== null;
        return isDue && !isClosed;
    }).length;
    const onTimeActions = totalActions - overdueCount;
    const overdueScore = Math.round((onTimeActions / (totalActions || 1)) * 100);
    const overdueGap = overdueCount > 0
        ? `${overdueCount} aksiyonun vadesi geçmiş ve hâlâ açık — gecikme takibi gerekli (GIAS 2025 Std. 2400)`
        : '';

    const comp3: QaipHealthComponent = {
        key: 'overdue_actions',
        label: 'Gecikmiş Aksiyonlar',
        score: overdueScore,
        weight: 0.30,
        weighted: Math.round(overdueScore * 0.30),
        gap: overdueGap,
        raw_total: totalActions,
        raw_passing: onTimeActions,
    };

    // ─── Genel Skor Hesabı ────────────────────────────────────────────────────────
    // Toplam ağırlıklı skor — Math.max/min ile [0, 100] aralığında sınırlandırma
    const components: QaipHealthComponent[] = [comp1, comp2, comp3];
    const overall = Math.max(
        0,
        Math.min(100, components.reduce((sum, c) => sum + (c?.weighted ?? 0), 0))
    );
    const zone: QaipHealthScore['zone'] =
        overall >= 85 ? 'GREEN' : overall >= 70 ? 'YELLOW' : 'RED';

    return {
        overall,
        zone,
        components,
        passesGate: overall >= 85,
        source: 'REALTIME',
        computed_at: now,
    };
}

export function useQaipHealth(input: QaipStatsInput = {}) {
    return useQuery({
        queryKey: QAIP_KEYS.healthScore(input),
        queryFn: () => computeQaipHealth(input),
        staleTime: 120_000, // 2 dakika cache
        retry: 2,
    });
}

// ─── QAIP Review Oluşturma ────────────────────────────────────────────────────

export interface CreateQaipReviewInput {
    engagement_id?: string;
    reviewer_id?: string;
    checklist_id?: string;
    notes?: string;
}

export async function createQaipReview(input: CreateQaipReviewInput): Promise<QaipReview> {
    const { data, error } = await supabase
        .from('qaip_reviews')
        .insert({
            engagement_id: input?.engagement_id ?? null,
            reviewer_id: input?.reviewer_id ?? null,
            checklist_id: input?.checklist_id ?? null,
            results: {},
            total_score: 0,
            status: 'IN_PROGRESS',
            notes: input?.notes ?? null,
        })
        .select()
        .single();

    if (error) {
        console.error('[SENTINEL][QAIP] Review oluşturulamadı:', error);
        throw error;
    }
    return data as QaipReview;
}

export function useCreateQaipReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createQaipReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['qaip-reviews'] });
            queryClient.invalidateQueries({ queryKey: ['qaip-health'] });
            toast.success('QAIP incelemesi oluşturuldu ✓');
        },
        onError: (err) => {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            toast.error(`QAIP review oluşturulamadı: ${msg}`);
        },
    });
}
