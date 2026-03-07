/*
  # Wave 27: Delphi Engine & AI Probe Generator
  
  ## New Tables
  1. `delphi_queries`  — Natural language queries that users typed in TextToRulePanel
  2. `generated_probes` — AI-generated probe configs persisted to Supabase

  ## Security
  - RLS enabled on both tables
  - Dev anon read policies for demo environment
*/

-- ============================================================
-- 1. delphi_queries — Natural language query history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delphi_queries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'::uuid,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  input_text    text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'GENERATED', 'ACCEPTED', 'REJECTED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delphi_queries_tenant    ON public.delphi_queries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delphi_queries_status    ON public.delphi_queries(status);
CREATE INDEX IF NOT EXISTS idx_delphi_queries_created   ON public.delphi_queries(created_at DESC);

ALTER TABLE public.delphi_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delphi_queries: authenticated read"
  ON public.delphi_queries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "delphi_queries: authenticated insert"
  ON public.delphi_queries FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "delphi_queries: dev anon read"
  ON public.delphi_queries FOR SELECT TO anon
  USING (true);

CREATE POLICY "delphi_queries: dev anon insert"
  ON public.delphi_queries FOR INSERT TO anon
  WITH CHECK (true);

-- ============================================================
-- 2. generated_probes — AI-produced probe configurations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.generated_probes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'::uuid,
  query_id        uuid        REFERENCES public.delphi_queries(id) ON DELETE SET NULL,
  title           text        NOT NULL DEFAULT '',
  description     text        NOT NULL DEFAULT '',
  category        text        NOT NULL DEFAULT 'OPS'
                  CHECK (category IN ('FRAUD', 'OPS', 'COMPLIANCE')),
  severity        text        NOT NULL DEFAULT 'MEDIUM'
                  CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
  source          text        NOT NULL DEFAULT 'core_banking',
  query_payload   text        NOT NULL DEFAULT '',
  schedule_cron   text        NOT NULL DEFAULT '0 */4 * * *',
  risk_threshold  integer     NOT NULL DEFAULT 5,
  reasoning       text        NOT NULL DEFAULT '',
  status          text        NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'DEPLOYED')),
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_probes_tenant   ON public.generated_probes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_generated_probes_status   ON public.generated_probes(status);
CREATE INDEX IF NOT EXISTS idx_generated_probes_category ON public.generated_probes(category);
CREATE INDEX IF NOT EXISTS idx_generated_probes_created  ON public.generated_probes(created_at DESC);

ALTER TABLE public.generated_probes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_probes: authenticated read"
  ON public.generated_probes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "generated_probes: authenticated insert"
  ON public.generated_probes FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "generated_probes: authenticated update"
  ON public.generated_probes FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "generated_probes: dev anon read"
  ON public.generated_probes FOR SELECT TO anon
  USING (true);

CREATE POLICY "generated_probes: dev anon insert"
  ON public.generated_probes FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "generated_probes: dev anon update"
  ON public.generated_probes FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
