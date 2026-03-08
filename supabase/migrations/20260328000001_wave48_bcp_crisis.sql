-- =============================================================================
-- WAVE 48: BCP & Crisis Management Cockpit
-- =============================================================================
-- Tables:
--   crisis_events   — Active and historical crisis incidents
--   bcp_scenarios   — Business Continuity Plan scenarios
--   recovery_logs   — Step-by-step recovery action log
-- =============================================================================

-- 1. BCP SCENARIOS — Plan kitaplığı
CREATE TABLE IF NOT EXISTS public.bcp_scenarios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  scenario_code   text NOT NULL UNIQUE,
  title           text NOT NULL,
  category        text NOT NULL DEFAULT 'IT' CHECK (category IN (
                    'IT', 'NATURAL_DISASTER', 'CYBER', 'OPERATIONAL', 'PANDEMIC', 'SUPPLY_CHAIN'
                  )),
  severity        text NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  rto_minutes     integer NOT NULL DEFAULT 240,   -- Recovery Time Objective
  rpo_minutes     integer NOT NULL DEFAULT 60,    -- Recovery Point Objective
  description     text,
  steps           jsonb NOT NULL DEFAULT '[]',
  owner           text NOT NULL DEFAULT '',
  is_tested       boolean NOT NULL DEFAULT false,
  last_test_date  date,
  test_result     text CHECK (test_result IN ('PASSED', 'FAILED', 'PARTIAL', NULL)),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bcp_scenarios_tenant   ON public.bcp_scenarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bcp_scenarios_category ON public.bcp_scenarios(category);
ALTER TABLE public.bcp_scenarios DISABLE ROW LEVEL SECURITY;

-- 2. CRISIS EVENTS — Aktif ve tarihsel kriz olayları
CREATE TABLE IF NOT EXISTS public.crisis_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  scenario_id     uuid REFERENCES public.bcp_scenarios(id) ON DELETE SET NULL,
  event_code      text NOT NULL UNIQUE,
  title           text NOT NULL,
  description     text,
  severity        text NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status          text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
                    'ACTIVE', 'CONTAINED', 'RECOVERING', 'RESOLVED', 'POST_MORTEM'
                  )),
  activated_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  rto_target_at   timestamptz NOT NULL,     -- activated_at + rto_minutes
  rpo_target_at   timestamptz NOT NULL,     -- activated_at + rpo_minutes
  affected_systems text[] NOT NULL DEFAULT '{}',
  crisis_owner    text NOT NULL DEFAULT '',
  escalated_to_cae boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crisis_events_tenant  ON public.crisis_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crisis_events_status  ON public.crisis_events(status);
CREATE INDEX IF NOT EXISTS idx_crisis_events_active  ON public.crisis_events(status, activated_at);
ALTER TABLE public.crisis_events DISABLE ROW LEVEL SECURITY;

-- 3. RECOVERY LOGS — Adım adım kurtarma aksiyon defteri
CREATE TABLE IF NOT EXISTS public.recovery_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  crisis_id       uuid NOT NULL REFERENCES public.crisis_events(id) ON DELETE CASCADE,
  step_number     integer NOT NULL DEFAULT 1,
  action_title    text NOT NULL,
  action_detail   text,
  status          text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                    'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'
                  )),
  assigned_to     text NOT NULL DEFAULT '',
  started_at      timestamptz,
  completed_at    timestamptz,
  elapsed_minutes integer GENERATED ALWAYS AS (
    CASE
      WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))::integer / 60
      ELSE NULL
    END
  ) STORED,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_logs_crisis  ON public.recovery_logs(crisis_id);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_status  ON public.recovery_logs(status);
ALTER TABLE public.recovery_logs DISABLE ROW LEVEL SECURITY;
