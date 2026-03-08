-- =============================================================================
-- SENTINEL V3.0 — GRANT TABLE PRIVILEGES TO anon ROLE
-- Error: "permission denied for table" means GRANT is missing (not just RLS)
-- =============================================================================

-- GRANT SELECT to anon role for all tables that return 401
GRANT SELECT ON public.stakeholders TO anon;
GRANT SELECT ON public.tasks TO anon;
GRANT INSERT ON public.tasks TO anon;
GRANT UPDATE ON public.tasks TO anon;
GRANT SELECT ON public.timesheets TO anon;
GRANT INSERT ON public.timesheets TO anon;
GRANT SELECT ON public.governance_board_meetings TO anon;
GRANT INSERT ON public.governance_board_meetings TO anon;
GRANT INSERT ON public.audit_logs TO anon;
GRANT SELECT ON public.risk_taxonomy TO anon;
GRANT SELECT ON public.rcsa_questions TO anon;
GRANT SELECT ON public.escalations TO anon;
GRANT SELECT ON public.automation_rules TO anon;
GRANT SELECT ON public.playbook_entries TO anon;
GRANT SELECT ON public.data_sources TO anon;

-- Also grant SELECT to authenticated for completeness
GRANT SELECT ON public.stakeholders TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.timesheets TO authenticated;
GRANT SELECT ON public.governance_board_meetings TO authenticated;

-- Verify grants
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('stakeholders', 'tasks', 'timesheets', 'governance_board_meetings')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
