-- =============================================================================
-- Wave 62: Geopolitical Risk & Sanctions Radar
-- =============================================================================

-- 1. sanction_lists — Global Yaptırım ve Ambargo Listeleri
CREATE TABLE IF NOT EXISTS public.sanction_lists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  entity_name     TEXT NOT NULL,
  entity_type     TEXT NOT NULL,                -- 'PERSON', 'COMPANY', 'VESSEL', 'COUNTRY'
  country_code    TEXT,                         -- 'IR', 'RU', 'KP', 'SY' vs.
  list_source     TEXT NOT NULL,                -- 'OFAC', 'UN', 'EU', 'HMT'
  sanction_type   TEXT NOT NULL DEFAULT 'SDN',  -- 'SDN', 'SSI', 'NON-SDN'
  risk_level      TEXT NOT NULL DEFAULT 'high', -- 'critical', 'high', 'medium'
  matched_at      TIMESTAMPTZ,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. aml_alerts — Şüpheli İşlem (AML) ve Fon Transferi Alarmları
CREATE TABLE IF NOT EXISTS public.aml_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
  alert_code          TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  alert_type          TEXT NOT NULL DEFAULT 'SWIFT_TRANSFER', -- 'SWIFT_TRANSFER', 'CASH_DEPOSIT', 'TRADE_FINANCE'
  severity            TEXT NOT NULL DEFAULT 'high',           -- 'critical', 'high', 'medium', 'low'
  status              TEXT NOT NULL DEFAULT 'open',           -- 'open', 'investigating', 'reported_to_fiu', 'false_positive', 'resolved'
  customer_id         TEXT,
  customer_name       TEXT,
  transaction_amount  NUMERIC(15,2),
  transaction_currency TEXT DEFAULT 'USD',
  origin_country      TEXT,
  destination_country TEXT,
  total_transactions  INTEGER NOT NULL DEFAULT 1,             -- Aynı şüpheli döngüdeki işlem sayısı
  risk_score          NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  evidence            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. geopolitical_events — Makro Jeopolitik Risk Olayları (Harita için)
CREATE TABLE IF NOT EXISTS public.geopolitical_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  title           TEXT NOT NULL,
  description     TEXT,
  region          TEXT NOT NULL,                -- 'Middle East', 'Eastern Europe', 'Asia Pacific'
  country_code    TEXT,
  coordinates     JSONB,                        -- { "lat": 48.3794, "lng": 31.1656 }
  event_type      TEXT NOT NULL DEFAULT 'CONFLICT', -- 'CONFLICT', 'REGIME_CHANGE', 'TRADE_WAR', 'CYBER_ATTACK'
  impact_level    TEXT NOT NULL DEFAULT 'high', -- 'critical', 'high', 'medium', 'low'
  is_active       BOOLEAN NOT NULL DEFAULT true,
  occurred_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sanctions_tenant ON public.sanction_lists(tenant_id, is_active, risk_level);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_tenant ON public.aml_alerts(tenant_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_geopol_events_tenant ON public.geopolitical_events(tenant_id, is_active, impact_level);

-- RLS
ALTER TABLE public.sanction_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geopolitical_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sanctions_access"
  ON public.sanction_lists FOR ALL TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);

CREATE POLICY "aml_alerts_access"
  ON public.aml_alerts FOR ALL TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);

CREATE POLICY "geopol_events_access"
  ON public.geopolitical_events FOR ALL TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);
