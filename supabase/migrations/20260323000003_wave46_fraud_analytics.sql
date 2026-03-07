-- =============================================================================
-- Wave 46: Fraud Fingerprint & Behavior Analytics
-- =============================================================================

-- 1. user_behavior_logs — Kullanıcı Davranış İzi Tablosu
CREATE TABLE IF NOT EXISTS public.user_behavior_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  user_id         TEXT NOT NULL,
  user_name       TEXT,
  session_id      TEXT,
  event_type      TEXT NOT NULL,             -- 'LOGIN', 'DATA_EXPORT', 'REPORT_VIEW', 'CONFIG_CHANGE', 'BULK_DOWNLOAD'
  event_category  TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'suspicious', 'critical'
  ip_address      TEXT,
  user_agent      TEXT,
  resource_type   TEXT,                      -- 'report', 'finding', 'customer_data'
  resource_id     TEXT,
  metadata        JSONB,                     -- Ek bağlam: dosya boyutu, kayıt sayısı vb.
  risk_score      NUMERIC(5,2) NOT NULL DEFAULT 0.0, -- 0-100
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. fraud_alerts — Tespit Edilen Suiistimal Uyarıları
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  alert_code      TEXT NOT NULL,             -- 'UNUSUAL_IP', 'BULK_DOWNLOAD', 'OFF_HOURS_ACCESS', 'PRIVILEGE_ESCALATION'
  title           TEXT NOT NULL,
  description     TEXT,
  severity        TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status          TEXT NOT NULL DEFAULT 'open',  -- 'open', 'investigating', 'resolved', 'false_positive'
  affected_user   TEXT,
  affected_user_name TEXT,
  source_log_id   UUID REFERENCES public.user_behavior_logs(id) ON DELETE SET NULL,
  risk_score      NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  evidence        JSONB,
  resolved_by     TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_behavior_logs_tenant     ON public.user_behavior_logs(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_user       ON public.user_behavior_logs(tenant_id, user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_category   ON public.user_behavior_logs(tenant_id, event_category, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_tenant      ON public.fraud_alerts(tenant_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user        ON public.fraud_alerts(tenant_id, affected_user, created_at DESC);

-- RLS
ALTER TABLE public.user_behavior_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "behavior_logs_access"
  ON public.user_behavior_logs FOR ALL TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);

CREATE POLICY "fraud_alerts_access"
  ON public.fraud_alerts FOR ALL TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);
