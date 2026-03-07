-- ============================================================
-- Wave 23: TPRM & Vendor Portal — Core Tables
-- Migration: 20260320000000
-- ============================================================

-- 1. Ana Tedarikçi Kayıtları (tprm_vendors)
CREATE TABLE IF NOT EXISTS tprm_vendors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  category            TEXT,
  risk_tier           TEXT NOT NULL DEFAULT 'Tier 3'
                        CHECK (risk_tier IN ('Tier 1', 'Tier 2', 'Tier 3')),
  criticality_score   INTEGER NOT NULL DEFAULT 0 CHECK (criticality_score BETWEEN 0 AND 100),
  status              TEXT NOT NULL DEFAULT 'Active'
                        CHECK (status IN ('Active','Inactive','Under Review','Terminated')),
  contact_person      TEXT,
  email               TEXT,
  contract_start      DATE,
  contract_end        DATE,
  last_audit_date     DATE,
  country             TEXT,
  data_access_level   TEXT NOT NULL DEFAULT 'None'
                        CHECK (data_access_level IN ('None','Limited','Full')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tedarikçi Değerlendirmeleri (vendor_assessments)
CREATE TABLE IF NOT EXISTS tprm_assessments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID NOT NULL REFERENCES tprm_vendors(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Draft'
                  CHECK (status IN ('Draft','Sent','In Progress','Completed','Review Needed')),
  risk_score    INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  assessor      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Değerlendirme Soruları ve Yanıtları
CREATE TABLE IF NOT EXISTS tprm_assessment_answers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID NOT NULL REFERENCES tprm_assessments(id) ON DELETE CASCADE,
  question_text       TEXT NOT NULL,
  vendor_response     TEXT,
  ai_grade_score      INTEGER CHECK (ai_grade_score BETWEEN 0 AND 100),
  ai_grade_rationale  TEXT,
  category            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tedarikçi Erişim Token'ları (Vendor Portal magic link)
CREATE TABLE IF NOT EXISTS vendor_access_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES tprm_vendors(id) ON DELETE CASCADE,
  assessment_id   UUID NOT NULL REFERENCES tprm_assessments(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  is_used         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Özet Görünüm (Dashboard metrikleri için)
DROP VIEW IF EXISTS tprm_vendor_summary;
CREATE OR REPLACE VIEW tprm_vendor_summary AS
SELECT
  v.*,
  COUNT(a.id)                                                     AS total_assessments,
  COUNT(a.id) FILTER (WHERE a.status = 'Completed')              AS completed_assessments,
  COUNT(a.id) FILTER (WHERE a.status IN ('Sent','In Progress'))   AS active_assessments,
  COALESCE(ROUND(AVG(a.risk_score)), 0)                          AS avg_risk_score,
  MAX(a.completed_at)                                             AS last_assessment_date
FROM tprm_vendors v
LEFT JOIN tprm_assessments a ON a.vendor_id = v.id
GROUP BY v.id;

-- 6. Performans İndeksleri
CREATE INDEX IF NOT EXISTS idx_tprm_assessments_vendor_id ON tprm_assessments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tprm_answers_assessment_id ON tprm_assessment_answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_vendor_tokens_token ON vendor_access_tokens(token);

-- 7. RLS Kapalı (geliştirme convention'ı)
ALTER TABLE tprm_vendors           DISABLE ROW LEVEL SECURITY;
ALTER TABLE tprm_assessments       DISABLE ROW LEVEL SECURITY;
ALTER TABLE tprm_assessment_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_access_tokens   DISABLE ROW LEVEL SECURITY;
