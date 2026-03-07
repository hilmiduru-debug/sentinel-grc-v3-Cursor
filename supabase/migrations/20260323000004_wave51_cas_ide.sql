-- =============================================================================
-- Wave 51: CAS IDE & Script Scheduler
-- =============================================================================

-- 1. audit_scripts — Denetim Senaryo Kütüphanesi
CREATE TABLE IF NOT EXISTS public.audit_scripts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id),
  title             TEXT NOT NULL,
  description       TEXT,
  script_type       TEXT NOT NULL DEFAULT 'SQL', -- 'SQL', 'PYTHON', 'JINJA', 'REGEX'
  category          TEXT NOT NULL DEFAULT 'ACCESS_CONTROL',
  -- 'ACCESS_CONTROL', 'FRAUD_DETECTION', 'DATA_QUALITY', 'COMPLIANCE', 'DORMANT_ACCOUNTS', 'SEGREGATION_OF_DUTIES'
  schedule_cron     TEXT,                         -- '0 3 * * *' = gece 03:00
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_scheduled      BOOLEAN NOT NULL DEFAULT false,
  script_body       TEXT NOT NULL,               -- Gerçek sorgu / kod
  last_run_at       TIMESTAMPTZ,
  last_run_status   TEXT,                        -- 'success', 'error', 'timeout'
  last_run_results  INTEGER,                     -- Dönen kayıt sayısı
  total_executions  INTEGER NOT NULL DEFAULT 0,
  error_count       INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms   INTEGER NOT NULL DEFAULT 0,
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. script_execution_logs — Her Çalıştırma Kaydı
CREATE TABLE IF NOT EXISTS public.script_execution_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  script_id       UUID NOT NULL REFERENCES public.audit_scripts(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error', 'timeout'
  triggered_by    TEXT NOT NULL DEFAULT 'scheduler', -- 'scheduler', 'manual', 'api'
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  rows_returned   INTEGER,
  error_message   TEXT,
  output_preview  TEXT,                           -- İlk 500 karakter
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_scripts_tenant    ON public.audit_scripts(tenant_id, is_active, category);
CREATE INDEX IF NOT EXISTS idx_audit_scripts_scheduled ON public.audit_scripts(tenant_id, is_scheduled, is_active);
CREATE INDEX IF NOT EXISTS idx_exec_logs_script        ON public.script_execution_logs(script_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exec_logs_tenant        ON public.script_execution_logs(tenant_id, status, started_at DESC);

-- RLS
ALTER TABLE public.audit_scripts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_scripts_access"
  ON public.audit_scripts FOR ALL TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);

CREATE POLICY "exec_logs_access"
  ON public.script_execution_logs FOR ALL TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);
