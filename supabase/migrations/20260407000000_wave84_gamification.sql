-- =============================================================================
-- WAVE 84: The Hunter's Guild (Denetim Oyunlaştırma ve Performans Sistemi)
-- =============================================================================
-- Tables:
--   auditor_profiles         — Denetçi Oyunlaştırma Profili (XP, Level, Rank)
--   auditor_xp_logs          — Denetçilerin kazandıkları XP logları
--   earned_badges            — Özel başarılar sonucu kazanılan rozetler
-- =============================================================================

-- 1. AUDITOR PROFILES (Gamification Hub)
-- Tablo zaten var olduğu için yeni oyunlaştırma kolonlarını (xp, seviye, unvan) ALTER TABLE ile ekliyoruz.
ALTER TABLE public.auditor_profiles 
  ADD COLUMN IF NOT EXISTS full_name text DEFAULT 'Bilinmeyen Denetçi',
  ADD COLUMN IF NOT EXISTS current_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_to_next_level integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS rank_name text NOT NULL DEFAULT 'Gözlemci';

-- Tablonun tenant izolasyonu vs halihazırda eski dosyasında yapılmış durumda.


-- 2. AUDITOR XP LOGS (Puan Kazanım Geçmişi)
CREATE TABLE IF NOT EXISTS public.auditor_xp_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  auditor_id          uuid NOT NULL REFERENCES public.auditor_profiles(user_id) ON DELETE CASCADE,
  action_type         text NOT NULL,                 -- Ör: 'CRITICAL_FINDING', 'EXCELLENT_REPORT'
  xp_awarded          integer NOT NULL,
  description         text NOT NULL,                 -- Ör: 'Kritik Kara Para Aklama Bulgusu Yakaladı'
  awarded_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_xp_prof ON public.auditor_xp_logs(auditor_id);
ALTER TABLE public.auditor_xp_logs DISABLE ROW LEVEL SECURITY;

-- 3. EARNED BADGES (Rozetler)
CREATE TABLE IF NOT EXISTS public.earned_badges (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  auditor_id          uuid NOT NULL REFERENCES public.auditor_profiles(user_id) ON DELETE CASCADE,
  badge_name          text NOT NULL,                 -- Ör: 'Kartal Gözü', 'Sıfır Gün Avcısı'
  badge_icon          text NOT NULL,                 -- Lucide icon name mapping e.g 'Eye', 'ShieldAlert'
  rarity              text NOT NULL DEFAULT 'COMMON' -- COMMON, RARE, EPIC, LEGENDARY
    CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  earned_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_badge_prof ON public.earned_badges(auditor_id);
ALTER TABLE public.earned_badges DISABLE ROW LEVEL SECURITY;
