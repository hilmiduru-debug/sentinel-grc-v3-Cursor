/*
  # Wave 39: Traceability Golden Thread VIEW
  
  Bu VIEW, denetim sürecinin uçtan uca izlenebilirliğini tek sorguda sunar:
  Strategy → Universe → Workpaper → Finding → Action
  
  Birleştirilen tablolar:
  - actions
  - audit_findings (or rkm_risks as findings source)
  - audit_programs (workpaper düzeyinde)
  - audit_engagements (universe düzeyinde)
  - audit_plan_periods (strategy düzeyinde)
*/

-- ============================================================
-- golden_thread_view — Altın İp İzlenebilirlik VIEW'ı
-- ============================================================
CREATE OR REPLACE VIEW public.golden_thread_view AS
SELECT
  -- Action katmanı
  a.id                          AS action_id,
  a.title                       AS action_title,
  a.status                      AS action_status,
  a.current_due_date            AS due_date,
  a.original_due_date,
  NULL::text[]                  AS regulatory_tags,
  a.finding_snapshot,

  -- Finding katmanı (snapshot'tan veya doğrudan AF join)
  a.finding_id                  AS finding_id,
  a.finding_snapshot->>'title'                AS finding_title,
  a.finding_snapshot->>'severity'             AS finding_severity,
  a.finding_snapshot->>'gias_category'        AS finding_gias_category,
  a.finding_snapshot->>'description'          AS finding_description,

  -- Audit program (workpaper katmanı)
  NULL::uuid                    AS program_id,
  NULL::text                    AS program_title,
  NULL::text                    AS program_type,

  -- Audit engagement (universe katmanı)
  ae.id                         AS engagement_id,
  ae.title                      AS engagement_title,
  ae.status                     AS audit_type,
  ae.title                      AS scope_statement,
  NULL::text                    AS engagement_risk_rating,

  -- Audit plan period (strategy katmanı)
  sao.id                        AS plan_period_id,
  sao.title                     AS plan_period_title,
  NULL::integer                 AS plan_year,
  sao.description               AS strategic_objective,

  -- Assignee
  a.assignee_user_id            AS assignee_unit_id,
  a.created_at                  AS action_created_at

FROM public.actions a
LEFT JOIN public.audit_findings af
  ON af.id = a.finding_id
LEFT JOIN public.audit_engagements ae
  ON ae.id = af.engagement_id
LEFT JOIN public.strategic_audit_objectives sao
  ON sao.id = ae.strategic_objective_ids[1]
WHERE a.finding_snapshot IS NOT NULL;

-- RLS için güvenlik tanımı (VIEW sahibi, çağıranın RLS politikalarını kullanır)
ALTER VIEW public.golden_thread_view OWNER TO postgres;

COMMENT ON VIEW public.golden_thread_view IS
  'Wave 39: Traceability Golden Thread — Action → Finding → Program → Engagement → Plan hiyerarşik izlenebilirlik VIEW''ı';
