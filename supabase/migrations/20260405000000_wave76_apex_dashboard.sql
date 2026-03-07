-- =============================================================================
-- WAVE 76: The Apex Dashboard (God's Eye View / Executive Summaries)
-- =============================================================================
-- Tables:
--   apex_executive_summaries — Top-level consolidated KPI metrics and overall health score.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.apex_executive_summaries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  snapshot_date       date NOT NULL DEFAULT CURRENT_DATE,
  grc_health_score    integer NOT NULL CHECK (grc_health_score BETWEEN 0 AND 1000),
  trend_direction     text NOT NULL DEFAULT 'STABLE'
    CHECK (trend_direction IN ('UP', 'DOWN', 'STABLE')),
  active_critical_risks integer NOT NULL DEFAULT 0,
  open_incidents      integer NOT NULL DEFAULT 0,
  compliance_ratio    numeric(5,2) NOT NULL DEFAULT 100.00,
  executive_message   text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apex_summary_date_tenant 
  ON public.apex_executive_summaries(tenant_id, snapshot_date);

ALTER TABLE public.apex_executive_summaries DISABLE ROW LEVEL SECURITY;
