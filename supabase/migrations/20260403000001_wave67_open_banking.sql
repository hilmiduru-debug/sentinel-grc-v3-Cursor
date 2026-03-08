-- =============================================================================
-- WAVE 67: Open Banking & API Security Auditor
-- =============================================================================
-- Tables:
--   api_gateway_logs — Central API request logging (Rate limiting, status codes)
--   psd2_tokens      — PSD2 Open Banking OAuth/Consent Tokens
--   api_breaches     — Incident tracker for API anomalies and token leakages
-- =============================================================================

-- 1. API GATEWAY LOGS (Traffic & Health Monitörü)
CREATE TABLE IF NOT EXISTS public.api_gateway_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  endpoint            text NOT NULL,                   -- Ör: /api/v1/accounts/balances
  method              text NOT NULL DEFAULT 'GET',
  consumer_app        text NOT NULL,                   -- TPP (Third Party Provider) Name
  ip_address          text,
  status_code         integer NOT NULL DEFAULT 200,
  response_time_ms    integer NOT NULL,
  is_rate_limited     boolean NOT NULL DEFAULT false,
  timestamp           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_tenant ON public.api_gateway_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_time ON public.api_gateway_logs(timestamp);
ALTER TABLE public.api_gateway_logs DISABLE ROW LEVEL SECURITY;

-- 2. PSD2 TOKENS (Açık Bankacılık Rıza ve Token'ları)
CREATE TABLE IF NOT EXISTS public.psd2_tokens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  tpp_name            text NOT NULL,                  -- Ör: Fintek X
  client_id           text NOT NULL,
  scopes              text[] NOT NULL DEFAULT '{}',   -- Ör: ['accounts', 'payments']
  status              text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED')),
  issued_at           timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL,
  revoked_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_psd2_tokens_tenant ON public.psd2_tokens(tenant_id);
ALTER TABLE public.psd2_tokens DISABLE ROW LEVEL SECURITY;

-- 3. API BREACHES & ANOMALIES (Güvenlik İhlal Alarmları)
CREATE TABLE IF NOT EXISTS public.api_breaches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  anomaly_type        text NOT NULL,                  -- Ör: RATE_LIMIT_EXCEEDED, EXPIRED_TOKEN_USE
  description         text NOT NULL,
  source_ip           text,
  tpp_name            text,
  severity            text NOT NULL DEFAULT 'HIGH'
    CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status              text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'INVESTIGATING', 'BLOCKED', 'FALSE_POSITIVE', 'RESOLVED')),
  detected_at         timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_breaches_tenant ON public.api_breaches(tenant_id);
ALTER TABLE public.api_breaches DISABLE ROW LEVEL SECURITY;
