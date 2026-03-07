/*
  # Wave 49: Dynamic Risk Appetite & KRI Monitor
  
  ## Tablolar
  1. `risk_appetite_limits` — KRI başlıkları, hedef/uyarı/limit eşikleri
  2. `kri_readings`         — Her KRI için zaman serisi ölçüm değerleri
  
  ## Kural: Yalnızca DDL — INSERT → seed.sql
*/

-- ============================================================
-- 1. risk_appetite_limits
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_appetite_limits (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'::uuid,
  kri_code          text        NOT NULL DEFAULT '',
  kri_name          text        NOT NULL DEFAULT '',
  description       text        NOT NULL DEFAULT '',
  category          text        NOT NULL DEFAULT 'CREDIT'
                    CHECK (category IN ('CREDIT','LIQUIDITY','OPERATIONAL','MARKET','COMPLIANCE','CYBER')),
  unit              text        NOT NULL DEFAULT 'PERCENT',
  target_value      numeric     NOT NULL DEFAULT 0,
  warning_threshold numeric     NOT NULL DEFAULT 0,
  limit_threshold   numeric     NOT NULL DEFAULT 0,
  direction         text        NOT NULL DEFAULT 'LOWER_IS_BETTER'
                    CHECK (direction IN ('LOWER_IS_BETTER','HIGHER_IS_BETTER')),
  is_active         boolean     NOT NULL DEFAULT true,
  regulatory_ref    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_risk_appetite_kri_code UNIQUE (tenant_id, kri_code)
);

CREATE INDEX IF NOT EXISTS idx_risk_appetite_tenant   ON public.risk_appetite_limits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_risk_appetite_category ON public.risk_appetite_limits(category);
CREATE INDEX IF NOT EXISTS idx_risk_appetite_active   ON public.risk_appetite_limits(is_active);

ALTER TABLE public.risk_appetite_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_appetite_limits: auth read"   ON public.risk_appetite_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_appetite_limits: auth write"  ON public.risk_appetite_limits FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "risk_appetite_limits: anon read"   ON public.risk_appetite_limits FOR SELECT TO anon          USING (true);
CREATE POLICY "risk_appetite_limits: anon insert" ON public.risk_appetite_limits FOR INSERT TO anon          WITH CHECK (true);

-- ============================================================
-- 2. kri_readings — Zaman Serisi Ölçümler
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kri_readings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'::uuid,
  appetite_id     uuid        NOT NULL REFERENCES public.risk_appetite_limits(id) ON DELETE CASCADE,
  kri_code        text        NOT NULL DEFAULT '',
  reading_value   numeric     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'NORMAL'
                  CHECK (status IN ('NORMAL','WARNING','BREACH','CRITICAL')),
  note            text,
  measured_by     text        NOT NULL DEFAULT 'SYSTEM',
  measured_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kri_readings_tenant    ON public.kri_readings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kri_readings_appetite  ON public.kri_readings(appetite_id);
CREATE INDEX IF NOT EXISTS idx_kri_readings_kri_code  ON public.kri_readings(kri_code);
CREATE INDEX IF NOT EXISTS idx_kri_readings_measured  ON public.kri_readings(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_kri_readings_status    ON public.kri_readings(status);

ALTER TABLE public.kri_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kri_readings: auth read"   ON public.kri_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "kri_readings: auth write"  ON public.kri_readings FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "kri_readings: anon read"   ON public.kri_readings FOR SELECT TO anon          USING (true);
CREATE POLICY "kri_readings: anon insert" ON public.kri_readings FOR INSERT TO anon          WITH CHECK (true);
