-- ============================================================
-- SENTINEL V3.0 — RLS FIX (Supabase Dashboard SQL Editor)
-- ============================================================
-- Kopyalayıp Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- URL: https://supabase.com/dashboard/project/zgygkehcysfhyhcrwnsw/sql/new
-- ============================================================

-- 1. stakeholders: anon okuma izni ver
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stakeholders_anon_read" ON public.stakeholders;
CREATE POLICY "stakeholders_anon_read" ON public.stakeholders
  FOR SELECT USING (true);

-- 2. tasks: anon okuma + yazma izni ver
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_anon_read" ON public.tasks;
CREATE POLICY "tasks_anon_read" ON public.tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "tasks_anon_write" ON public.tasks;
CREATE POLICY "tasks_anon_write" ON public.tasks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "tasks_anon_update" ON public.tasks;
CREATE POLICY "tasks_anon_update" ON public.tasks FOR UPDATE USING (true);

-- 3. timesheets: anon okuma + yazma izni ver
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timesheets_anon_read" ON public.timesheets;
CREATE POLICY "timesheets_anon_read" ON public.timesheets FOR SELECT USING (true);
DROP POLICY IF EXISTS "timesheets_anon_write" ON public.timesheets;
CREATE POLICY "timesheets_anon_write" ON public.timesheets FOR INSERT WITH CHECK (true);

-- 4. governance_board_meetings: anon okuma + yazma izni ver
ALTER TABLE public.governance_board_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "board_meetings_anon_read" ON public.governance_board_meetings;
CREATE POLICY "board_meetings_anon_read" ON public.governance_board_meetings FOR SELECT USING (true);
DROP POLICY IF EXISTS "board_meetings_anon_write" ON public.governance_board_meetings;
CREATE POLICY "board_meetings_anon_write" ON public.governance_board_meetings FOR INSERT WITH CHECK (true);

-- 5. audit_logs: Adli İz kaydı için anon INSERT izni ver
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_anon_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_anon_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 6. rkm_nodes view: risk_taxonomy üzerine alias view
CREATE OR REPLACE VIEW public.rkm_nodes AS
SELECT
  id,
  tenant_id,
  path::text AS path,
  name,
  type,
  risk_weight,
  description,
  created_at
FROM public.risk_taxonomy;

-- 7. Kontrol sorgusu
SELECT 'RLS Fix Applied ✅' AS result;
