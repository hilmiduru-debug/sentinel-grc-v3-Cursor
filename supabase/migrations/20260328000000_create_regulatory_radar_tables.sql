-- ============================================================
-- Wave 47: Regulatory Radar & Horizon Scanner
-- Migration: 20260328000000
-- Tables: regulatory_bulletins, policy_impact_alerts
-- ============================================================

-- 1. Regülasyon Bültenleri (Mevzuat Sinyalleri)
CREATE TABLE IF NOT EXISTS regulatory_bulletins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_code    TEXT NOT NULL UNIQUE,          -- Örn: "BDDK-TEBL-2026-03"
  title            TEXT NOT NULL,
  summary          TEXT,
  full_text_url    TEXT,
  source_authority TEXT NOT NULL,                 -- BDDK, SPK, MASAK, FATF, EBA, BIS
  category         TEXT NOT NULL DEFAULT 'REGULATION'
                     CHECK (category IN ('REGULATION','GUIDANCE','CIRCULAR','CONSULTATION','DIRECTIVE','STANDARD')),
  impact_level     TEXT NOT NULL DEFAULT 'MEDIUM'
                     CHECK (impact_level IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT','PUBLISHED','ENACTED','REPEALED','CONSULTATION')),
  published_at     DATE,
  effective_date   DATE,
  comment_deadline DATE,
  affected_sectors TEXT[],                        -- ['BANKACILIK','SIGORTACILIK','FINTECH']
  tags             TEXT[],                        -- ['KRİPTO','LİKİDİTE','KVKK']
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Politika Etki Uyarıları (İç Politikaya Yansımaları)
CREATE TABLE IF NOT EXISTS policy_impact_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id         UUID NOT NULL REFERENCES regulatory_bulletins(id) ON DELETE CASCADE,
  bulletin_code       TEXT NOT NULL,
  internal_policy_ref TEXT NOT NULL,              -- Örn: "POL-KRD-001 - Kredi Politikası"
  department          TEXT NOT NULL,              -- Etkilenen departman
  impact_description  TEXT NOT NULL,
  required_action     TEXT NOT NULL,
  action_deadline     DATE,
  priority            TEXT NOT NULL DEFAULT 'HIGH'
                        CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  status              TEXT NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','ACCEPTED')),
  -- Uyum skoru: tamamlanan eylemler / toplam eylem — (total || 1)
  completion_pct      INTEGER NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  assigned_to         TEXT,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Radar Görünümü (özet dashboard metrikleri)
CREATE OR REPLACE VIEW regulatory_radar_summary AS
SELECT
  rb.source_authority,
  rb.impact_level,
  COUNT(rb.id)                                   AS bulletin_count,
  COUNT(pia.id)                                  AS open_alerts,
  -- Ortalama tamamlanma: sıfıra bölünme GREATEST ile korunmuştur
  COALESCE(
    ROUND(SUM(pia.completion_pct)::numeric / GREATEST(COUNT(pia.id), 1)),
    0
  )                                               AS avg_completion_pct
FROM regulatory_bulletins rb
LEFT JOIN policy_impact_alerts pia ON pia.bulletin_id = rb.id AND pia.status = 'OPEN'
WHERE rb.status IN ('PUBLISHED','ENACTED','CONSULTATION')
GROUP BY rb.source_authority, rb.impact_level;

-- 4. İndeksler
CREATE INDEX IF NOT EXISTS idx_reg_bulletins_authority  ON regulatory_bulletins(source_authority, status);
CREATE INDEX IF NOT EXISTS idx_reg_bulletins_impact     ON regulatory_bulletins(impact_level, effective_date);
CREATE INDEX IF NOT EXISTS idx_policy_alerts_bulletin   ON policy_impact_alerts(bulletin_id, status);
CREATE INDEX IF NOT EXISTS idx_policy_alerts_department ON policy_impact_alerts(department, priority);

-- 5. RLS Kapalı
ALTER TABLE regulatory_bulletins   DISABLE ROW LEVEL SECURITY;
ALTER TABLE policy_impact_alerts   DISABLE ROW LEVEL SECURITY;
