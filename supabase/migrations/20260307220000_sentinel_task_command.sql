-- ============================================================================
-- MIGRATION: Sentinel Task Command — MS To Do Klonu
-- Sentinel GRC v3.0 | Wave 11
-- Tarih: 2026-03-07
-- ============================================================================
-- Tablolar:
--   task_lists  — Akıllı listeler (Günüm, Önemli, Tümü, Planlı + özel)
--   sentinel_tasks — Görevler (bağımsız + linked entity)
-- ============================================================================

-- ─── 1. task_lists ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_lists (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  owner_id    UUID,                              -- user_profiles.id (NULL = paylaşımlı)
  name        TEXT        NOT NULL,
  icon        TEXT        DEFAULT '📋',          -- emoji veya icon key
  color       TEXT        DEFAULT '#6366f1',     -- hex renk
  is_smart    BOOLEAN     DEFAULT FALSE,         -- Akıllı liste (filtre tabanlı)
  smart_filter JSONB      DEFAULT '{}'::JSONB,   -- { "is_my_day": true } gibi filtre
  sort_order  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon task_lists select" ON public.task_lists FOR SELECT TO anon USING (true);
CREATE POLICY "anon task_lists insert" ON public.task_lists FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon task_lists update" ON public.task_lists FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon task_lists delete" ON public.task_lists FOR DELETE TO anon USING (true);

-- ─── 2. sentinel_tasks ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sentinel_tasks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  owner_id          UUID,                              -- user_profiles.id
  list_id           UUID        REFERENCES public.task_lists(id) ON DELETE SET NULL,

  -- Temel görev alanları
  title             TEXT        NOT NULL CHECK (char_length(title) > 0),
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'cancelled')),

  -- MS To Do akıllı filtre bayrakları
  is_important      BOOLEAN     DEFAULT FALSE,
  is_my_day         BOOLEAN     DEFAULT FALSE,
  due_date          DATE,
  reminder_at       TIMESTAMPTZ,

  -- Hibrit: Denetim bağlamı (NULL = basit görev)
  linked_entity_type TEXT       CHECK (linked_entity_type IN ('finding', 'workpaper', 'engagement', 'action', NULL)),
  linked_entity_id  UUID,                             -- ilgili tablonun PK'sı
  linked_entity_label TEXT,                           -- önbellek: entity başlığı

  -- Sıralama ve alt görevler
  sort_order        INTEGER     DEFAULT 0,
  parent_task_id    UUID        REFERENCES public.sentinel_tasks(id) ON DELETE CASCADE,

  -- Meta
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_sentinel_tasks_owner     ON public.sentinel_tasks (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_sentinel_tasks_list      ON public.sentinel_tasks (list_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sentinel_tasks_my_day    ON public.sentinel_tasks (is_my_day, status) WHERE is_my_day = true;
CREATE INDEX IF NOT EXISTS idx_sentinel_tasks_important ON public.sentinel_tasks (is_important, status) WHERE is_important = true;
CREATE INDEX IF NOT EXISTS idx_sentinel_tasks_due       ON public.sentinel_tasks (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sentinel_tasks_linked    ON public.sentinel_tasks (linked_entity_type, linked_entity_id) WHERE linked_entity_id IS NOT NULL;

-- updated_at tetikleyici
CREATE OR REPLACE FUNCTION update_sentinel_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sentinel_tasks_updated_at ON public.sentinel_tasks;
CREATE TRIGGER sentinel_tasks_updated_at
  BEFORE UPDATE ON public.sentinel_tasks
  FOR EACH ROW EXECUTE FUNCTION update_sentinel_tasks_updated_at();

-- RLS (Dev: anon bypass)
ALTER TABLE public.sentinel_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon sentinel_tasks select" ON public.sentinel_tasks FOR SELECT TO anon USING (true);
CREATE POLICY "anon sentinel_tasks insert" ON public.sentinel_tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon sentinel_tasks update" ON public.sentinel_tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon sentinel_tasks delete" ON public.sentinel_tasks FOR DELETE TO anon USING (true);

-- Seed veriler seed.sql dosyasındadır.
-- `npx supabase db reset` komutuyla schema + seed birlikte uygulanır.
