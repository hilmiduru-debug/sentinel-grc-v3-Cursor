-- ============================================================
-- Wave 69: Basel IV RWA & Capital Adequacy Simulator
-- Migration: 20260403000000
-- Tables: rwa_calculations, capital_adequacy_ratios
-- ============================================================

-- 1. Risk Ağırlıklı Varlık (RWA) Hesaplamaları (Basel IV Standart Yaklaşımı)
CREATE TABLE IF NOT EXISTS rwa_calculations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calc_code           TEXT NOT NULL UNIQUE,          -- Örn: "RWA-2026-Q1-CORP"
  calculation_date    DATE NOT NULL,
  asset_class         TEXT NOT NULL DEFAULT 'CORPORATE'
                        CHECK (asset_class IN ('CORPORATE','RETAIL','MORTGAGE','SOVEREIGN','BANK','EQUITY','OTHER')),
  exposure_amount     NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (exposure_amount >= 0),  -- EAD (Exposure at Default)
  ccf_pct             INTEGER NOT NULL DEFAULT 100 CHECK (ccf_pct BETWEEN 0 AND 100), -- Kredi Dönüşüm Faktörü
  risk_weight_pct     INTEGER NOT NULL DEFAULT 100 CHECK (risk_weight_pct >= 0),      -- Basel IV Risk Ağırlığı
  -- Hesaplanan RWA: (EAD * CCF%) * RiskWeight% -> Uygulamada hesaplanıp buraya kaydedilir veya DB GENERATED yapılabilir.
  -- GENERATED yapalım ki DB seviyesinde matematiksel tutarlılık olsun
  rwa_amount          NUMERIC(18,2) GENERATED ALWAYS AS (
                        (exposure_amount * (ccf_pct / 100.0)) * (risk_weight_pct / 100.0)
                      ) STORED,
  -- Kredi Riski Azaltım Teknikleri (CRM)
  crm_applied         BOOLEAN NOT NULL DEFAULT FALSE,
  crm_details         TEXT,                          -- Örn: "Hazine Bonosu Teminatı %20 indirim"
  -- Denetim ve Versiyon
  analyst             TEXT NOT NULL,
  is_approved         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Sermaye Yeterlilik Rasyoları (CAR - Capital Adequacy Ratios)
CREATE TABLE IF NOT EXISTS capital_adequacy_ratios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_period       TEXT NOT NULL UNIQUE,          -- Örn: "2026-Q1"
  report_date         DATE NOT NULL,
  -- Sermaye Kalemleri (Tier 1 & Tier 2)
  cet1_capital        NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (cet1_capital >= 0),
  tier1_capital       NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (tier1_capital >= 0),
  tier2_capital       NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (tier2_capital >= 0),
  -- Total Capital = Tier1 + Tier2
  total_capital       NUMERIC(18,2) GENERATED ALWAYS AS (tier1_capital + tier2_capital) STORED,
  -- Toplam RWA (Kredi + Piyasa + Operasyonel)
  credit_rwa          NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit_rwa >= 0),
  market_rwa          NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (market_rwa >= 0),
  operational_rwa     NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (operational_rwa >= 0),
  total_rwa           NUMERIC(18,2) GENERATED ALWAYS AS (credit_rwa + market_rwa + operational_rwa) STORED,
  -- Regülatif Sınırlar (BDDK)
  min_required_ratio  NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  capital_buffer_pct  NUMERIC(5,2) NOT NULL DEFAULT 2.50,
  -- Statü
  status              TEXT NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','SUBMITTED_TO_BDDK','APPROVED','REJECTED')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. İndeksler
CREATE INDEX IF NOT EXISTS idx_rwa_class_date ON rwa_calculations(asset_class, calculation_date DESC);
CREATE INDEX IF NOT EXISTS idx_car_period     ON capital_adequacy_ratios(report_period);

-- 4. RLS Kapalı
ALTER TABLE rwa_calculations        DISABLE ROW LEVEL SECURITY;
ALTER TABLE capital_adequacy_ratios DISABLE ROW LEVEL SECURITY;
