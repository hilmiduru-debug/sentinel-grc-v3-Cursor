-- =============================================================================
-- Wave 25: Autonomous Remediation — JIT Token & Auto Fix Logs
-- =============================================================================

-- 1. JIT Token tablosu (güvenli geçici yetki sistemi)
CREATE TABLE IF NOT EXISTS public.system_jit_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id       TEXT        NOT NULL,
  target_system   TEXT        NOT NULL,
  requested_by    TEXT        NOT NULL,
  token_value     TEXT        NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  is_revoked      BOOLEAN     NOT NULL DEFAULT FALSE,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Auto Fix execution logları
CREATE TABLE IF NOT EXISTS public.auto_fix_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id),
  campaign_id     UUID        REFERENCES public.master_action_campaigns(id) ON DELETE SET NULL,
  action_id       UUID        REFERENCES public.actions(id) ON DELETE SET NULL,
  jit_token_id    UUID        REFERENCES public.system_jit_tokens(id) ON DELETE SET NULL,
  fix_type        TEXT        NOT NULL
                  CHECK (fix_type IN (
                    'password_policy',
                    'firewall_rule',
                    'access_revoke',
                    'data_masking',
                    'audit_log_enable',
                    'config_drift',
                    'custom'
                  )),
  target_system   TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'success', 'failed', 'reverted')),
  initiated_by    TEXT        NOT NULL,
  result_summary  TEXT,
  error_message   TEXT,
  duration_ms     INTEGER,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_jit_tokens_action_id ON public.system_jit_tokens(action_id);
CREATE INDEX IF NOT EXISTS idx_system_jit_tokens_is_revoked ON public.system_jit_tokens(is_revoked, expires_at);
CREATE INDEX IF NOT EXISTS idx_auto_fix_logs_tenant_id ON public.auto_fix_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auto_fix_logs_campaign_id ON public.auto_fix_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_auto_fix_logs_status ON public.auto_fix_logs(status, created_at);

-- RLS
ALTER TABLE public.system_jit_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_fix_logs ENABLE ROW LEVEL SECURITY;

-- system_jit_tokens: bypass for test/service, authenticated users can insert/read
CREATE POLICY "jit_tokens_bypass"
  ON public.system_jit_tokens
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- auto_fix_logs: tenant-scoped access
CREATE POLICY "auto_fix_logs_tenant_access"
  ON public.auto_fix_logs
  FOR ALL
  TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);
