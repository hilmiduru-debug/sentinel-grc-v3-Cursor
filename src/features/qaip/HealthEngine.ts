/**
 * SENTINEL GRC v3.0 — Auto-QAIP Engine: Yerel Kalite Motoru
 * ==========================================================
 * GIAS 2025 Standard 12.1 — Kalite Güvence ve İyileştirme Programı
 *
 * Bu modül, AuditTask[] verisiyle yerel (offline/önizleme) QAIP skoru üretir.
 * Gerçek zamanlı Supabase hesabı için: entities/qaip/api/qaip-api.ts → computeQaipHealth
 *
 * GIAS 2025 Metrikleri:
 *  1. Kanıt Eksikliği Oranı  (Evidence Deficiency Rate)   — Ağırlık: %35
 *  2. 4-Göz Prensibi         (Four-Eyes Principle)        — Ağırlık: %35
 *  3. Gecikmiş Aksiyonlar    (Overdue Actions Rate)       — Ağırlık: %30
 *
 * SAVUNMACI PROGRAMLAMA:
 *  - Her bölme işleminde (x || 1) payda güvencesi — NaN önlemi
 *  - Optional chaining (?.) ile tüm veri erişimleri
 *  - Nullish coalescing (??) ile tüm değer atamaları
 */

import type { AuditTask } from '@/features/audit-creation/types';

// ─── Tip Tanımları ────────────────────────────────────────────────────────────

export interface HealthComponent {
    key: string;
    label: string;
    score: number;       // 0-100
    weight: number;      // 0-1 (toplam = 1.0)
    weighted: number;    // score * weight (tamsayı)
    gap: string;         // Boş string = sorun yok
    raw_total: number;
    raw_passing: number;
}

export interface FileHealthResult {
    score: number;                      // Ağırlıklı toplam skor (0-100)
    zone: 'GREEN' | 'YELLOW' | 'RED';  // 85+ YEŞIL, 70-84 SARI, <70 KIRMIZI
    components: HealthComponent[];
    qualityGaps: HealthComponent[];     // En kötü 3 bileşen
    passesGate: boolean;               // Kalitenin 85 eşiğini geçip geçmediği
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const GATE_THRESHOLD = 85;

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

/** İki ISO tarih dizesi arasındaki gün farkını hesaplar */
function daysBetween(a: string, b: string): number {
    const msPerDay = 86_400_000;
    const dateA = new Date(a).getTime();
    const dateB = new Date(b).getTime();
    if (isNaN(dateA) || isNaN(dateB)) return 0;
    return Math.abs(dateB - dateA) / msPerDay;
}

// ─── GIAS 2025 Metrik 1: Kanıt Eksikliği Oranı ───────────────────────────────
/**
 * Toplam tamamlanan görevler içinde kanıtı (evidence_links) olmayan yüzdeyi ölçer.
 * Kanıtsız bulgu oranı = kanıtsız_görev / toplam_tamamlanan
 * Skor = (1 - kanıtsız_oran) * 100
 */
function evidenceDeficiency(tasks: AuditTask[]): HealthComponent {
    const safeTasks = tasks ?? [];
    const done = safeTasks.filter((t) => t?.status === 'DONE');
    const total = done.length;

    if (total === 0) {
        return {
            key: 'evidence_deficiency',
            label: 'Kanıt Eksikliği Oranı',
            score: 100,
            weight: 0.35,
            weighted: 35,
            gap: '',
            raw_total: 0,
            raw_passing: 0,
        };
    }

    const withEvidence = done.filter(
        (t) => Array.isArray(t?.evidence_links) && (t?.evidence_links?.length ?? 0) > 0
    ).length;

    const deficientCount = total - withEvidence;
    const score = Math.round((withEvidence / (total || 1)) * 100);
    const gap =
        deficientCount > 0
            ? `${deficientCount} tamamlanan görevde kanıt eksik (GIAS 2025 Std. 2310)`
            : '';

    return {
        key: 'evidence_deficiency',
        label: 'Kanıt Eksikliği Oranı',
        score,
        weight: 0.35,
        weighted: Math.round(score * 0.35),
        gap,
        raw_total: total,
        raw_passing: withEvidence,
    };
}

// ─── GIAS 2025 Metrik 2: 4-Göz Prensibi ──────────────────────────────────────
/**
 * Tamamlanan görevlerin denetçi onayı (VALIDATED) durumunu kontrol eder.
 * 4-Göz ihlali: hazırlayan ve onaylayan aynı kişi, veya henüz onaysız.
 * Skor = onaylanan_görev / toplam_tamamlanan * 100
 *
 * Not: AuditTask'ta reviewer ayrı bir alan olmadığından validation_status = 'VALIDATED'
 * ve assigned_to boş olmayan kayıtları "4-göz geçti" olarak kabul ediyoruz.
 */
function fourEyesPrinciple(tasks: AuditTask[]): HealthComponent {
    const safeTasks = tasks ?? [];
    const done = safeTasks.filter((t) => t?.status === 'DONE');
    const total = done.length;

    if (total === 0) {
        return {
            key: 'four_eyes',
            label: '4-Göz Prensibi',
            score: 100,
            weight: 0.35,
            weighted: 35,
            gap: '',
            raw_total: 0,
            raw_passing: 0,
        };
    }

    // 4-göz geçen: VALIDATED statüsünde VE bir sorumlusu olan görevler
    const validated = done.filter(
        (t) => t?.validation_status === 'VALIDATED' && (t?.assigned_to ?? null) !== null
    ).length;

    const violations = total - validated;
    const score = Math.round((validated / (total || 1)) * 100);
    const gap =
        violations > 0
            ? `${violations} görevde 4-Göz Prensibi ihlali — onaysız veya tek imzalı (GIAS 2025 Std. 1100)`
            : '';

    return {
        key: 'four_eyes',
        label: '4-Göz Prensibi',
        score,
        weight: 0.35,
        weighted: Math.round(score * 0.35),
        gap,
        raw_total: total,
        raw_passing: validated,
    };
}

// ─── GIAS 2025 Metrik 3: Gecikmiş Aksiyonlar ─────────────────────────────────
/**
 * Devam eden (IN_PROGRESS) görevler içinde 5+ gün güncellenmeyen (gecikmiş) oranı.
 * Overdue oran = gecikmiş / toplam_devam_eden
 * Skor = (1 - overdue_oran) * 100
 */
function overdueActions(tasks: AuditTask[]): HealthComponent {
    const safeTasks = tasks ?? [];
    const inProgress = safeTasks.filter((t) => t?.status === 'IN_PROGRESS');
    const total = inProgress.length;

    if (total === 0) {
        return {
            key: 'overdue_actions',
            label: 'Gecikmiş Aksiyonlar',
            score: 100,
            weight: 0.30,
            weighted: 30,
            gap: '',
            raw_total: 0,
            raw_passing: 0,
        };
    }

    const now = new Date().toISOString();
    const onTime = inProgress.filter((t) => {
        const lastUpdate = t?.updated_at ?? t?.created_at ?? now;
        return daysBetween(lastUpdate, now) <= 5;
    }).length;

    const overdueCount = total - onTime;
    const score = Math.round((onTime / (total || 1)) * 100);
    const gap =
        overdueCount > 0
            ? `${overdueCount} aksiyon 5+ gündür güncellenmedi — gecikmiş (GIAS 2025 Std. 2400)`
            : '';

    return {
        key: 'overdue_actions',
        label: 'Gecikmiş Aksiyonlar',
        score,
        weight: 0.30,
        weighted: Math.round(score * 0.30),
        gap,
        raw_total: total,
        raw_passing: onTime,
    };
}

// ─── Ana Hesaplama Fonksiyonu ─────────────────────────────────────────────────

/**
 * calculateFileHealth — GIAS 2025 Standard 12.1
 *
 * Verilen AuditTask listesinden üç GIAS 2025 metriği hesaplar ve
 * 0-100 arası ağırlıklı bir "QAIP Uyum Skoru" döndürür.
 *
 * Ağırlıklar: Kanıt Eksikliği %35 + 4-Göz %35 + Gecikmiş Aksiyonlar %30 = %100
 */
export function calculateFileHealth(tasks: AuditTask[]): FileHealthResult {
    const safeTasks = Array.isArray(tasks) ? tasks : [];

    const components: HealthComponent[] = [
        evidenceDeficiency(safeTasks),
        fourEyesPrinciple(safeTasks),
        overdueActions(safeTasks),
    ];

    // Toplam ağırlıklı skor — NaN'a karşı Math.max(0, ...) ile sıfırdan küçük önlemi
    const score = Math.max(
        0,
        Math.min(100, components.reduce((sum, c) => sum + (c?.weighted ?? 0), 0))
    );

    const zone: FileHealthResult['zone'] =
        score >= 85 ? 'GREEN' : score >= 70 ? 'YELLOW' : 'RED';

    // En kötü 3 bileşen (gap'i olanlar, düşük skordan yükseğe)
    const qualityGaps = [...components]
        .filter((c) => (c?.gap ?? '') !== '')
        .sort((a, b) => (a?.score ?? 0) - (b?.score ?? 0))
        .slice(0, 3);

    return {
        score,
        zone,
        components,
        qualityGaps,
        passesGate: score >= GATE_THRESHOLD,
    };
}

export const GATE_MIN_SCORE = GATE_THRESHOLD;
