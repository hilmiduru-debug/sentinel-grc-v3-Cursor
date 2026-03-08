-- =============================================================================
-- SENTINEL V3.0 — ANON RLS FIX (for remaining 401 tables)
-- These policies explicitly grant access to the `anon` role
-- so that the frontend using the publishable/anon key can read these tables.
-- =============================================================================

-- 1. stakeholders → anon SELECT
DROP POLICY IF EXISTS "stakeholders_anon_read" ON public.stakeholders;
CREATE POLICY "stakeholders_anon_read" ON public.stakeholders
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "stakeholders_auth_read" ON public.stakeholders;
CREATE POLICY "stakeholders_auth_read" ON public.stakeholders
  FOR SELECT TO authenticated USING (true);

-- 2. tasks → anon SELECT + INSERT + UPDATE
DROP POLICY IF EXISTS "tasks_anon_read" ON public.tasks;
CREATE POLICY "tasks_anon_read" ON public.tasks
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "tasks_anon_write" ON public.tasks;
CREATE POLICY "tasks_anon_write" ON public.tasks
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_anon_update" ON public.tasks;
CREATE POLICY "tasks_anon_update" ON public.tasks
  FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "tasks_auth_all" ON public.tasks;
CREATE POLICY "tasks_auth_all" ON public.tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. timesheets → anon SELECT + INSERT
DROP POLICY IF EXISTS "timesheets_anon_read" ON public.timesheets;
CREATE POLICY "timesheets_anon_read" ON public.timesheets
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "timesheets_anon_write" ON public.timesheets;
CREATE POLICY "timesheets_anon_write" ON public.timesheets
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "timesheets_auth_all" ON public.timesheets;
CREATE POLICY "timesheets_auth_all" ON public.timesheets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. governance_board_meetings → anon SELECT + INSERT
DROP POLICY IF EXISTS "board_meetings_anon_read" ON public.governance_board_meetings;
CREATE POLICY "board_meetings_anon_read" ON public.governance_board_meetings
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "board_meetings_anon_write" ON public.governance_board_meetings;
CREATE POLICY "board_meetings_anon_write" ON public.governance_board_meetings
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "board_meetings_auth_all" ON public.governance_board_meetings;
CREATE POLICY "board_meetings_auth_all" ON public.governance_board_meetings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. audit_logs → anon INSERT (for Audit Trail tracking)
DROP POLICY IF EXISTS "audit_logs_anon_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_anon_insert" ON public.audit_logs
  FOR INSERT TO anon WITH CHECK (true);

-- 6. Recreate rkm_nodes view with SECURITY INVOKER
DROP VIEW IF EXISTS public.rkm_nodes;
CREATE VIEW public.rkm_nodes WITH (security_invoker = true) AS
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

-- Grant read on view to anon
GRANT SELECT ON public.rkm_nodes TO anon;
GRANT SELECT ON public.rkm_nodes TO authenticated;

-- 7. Verify: return current policy count for each table
SELECT schemaname, tablename, policyname, roles
FROM pg_policies
WHERE tablename IN ('stakeholders', 'tasks', 'timesheets', 'governance_board_meetings', 'audit_logs')
ORDER BY tablename, policyname;
