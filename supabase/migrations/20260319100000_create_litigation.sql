-- =============================================================================
-- Wave 75: Litigation & Penalty Prediction Engine — DDL Only
-- Dava ve Ceza Tahmin Motoru
-- =============================================================================

-- Dava Dosyaları (Legal Cases)
CREATE TABLE IF NOT EXISTS legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  case_number text NOT NULL,                   -- Örn: 2026/1043 E.
  plaintiff text NOT NULL,                     -- Davacı (Örn: XYZ A.Ş.)
  defendant text NOT NULL,                     -- Davalı (Örn: Sentinel Bank)
  court text NOT NULL,                         -- Mahkeme / Merci (Örn: İstanbul 1. Asliye Ticaret)
  case_type text NOT NULL,                     -- Örn: Ticari Dava, İş Davası
  filing_date date NOT NULL,                   -- Dava Açılış Tarihi
  claimed_amount numeric(15,2) DEFAULT 0,      -- Talep Edilen Tutar
  status text NOT NULL DEFAULT 'Açık'
    CHECK (status IN ('Açık', 'Derhal Çözüldü', 'Karara Bağlandı', 'Temyiz (İstinaf)', 'Kapalı')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_cases_tenant ON legal_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_status ON legal_cases(status);

ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read cases"    ON legal_cases FOR SELECT TO anon   USING (true);
CREATE POLICY "Anon insert cases"  ON legal_cases FOR INSERT TO anon   WITH CHECK (true);
CREATE POLICY "Anon update cases"  ON legal_cases FOR UPDATE TO anon   USING (true) WITH CHECK (true);
CREATE POLICY "Auth read cases"    ON legal_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert cases"  ON legal_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update cases"  ON legal_cases FOR UPDATE TO authenticated USING (true);


-- Düzenleyici Kurum Soruşturmaları (Regulatory Investigations)
CREATE TABLE IF NOT EXISTS regulatory_investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  regulator text NOT NULL,                     -- Düzenleyici Kurum (Örn: BDDK, Rekabet Kurumu, MASAK)
  subject text NOT NULL,                       -- Konu (Örn: Sendikasyon Soruşturması)
  investigation_date date NOT NULL DEFAULT CURRENT_DATE,
  investigator_lead text,                      -- Başmüfettiş / Lider Araştırmacı
  status text NOT NULL DEFAULT 'İncelemede'
    CHECK (status IN ('Ön İnceleme', 'İncelemede', 'Savunma Aşamasında', 'Karara Bağlandı', 'İptal Edildi')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg_invest_tenant ON regulatory_investigations(tenant_id);

ALTER TABLE regulatory_investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read reg_invest"    ON regulatory_investigations FOR SELECT TO anon   USING (true);
CREATE POLICY "Anon insert reg_invest"  ON regulatory_investigations FOR INSERT TO anon   WITH CHECK (true);
CREATE POLICY "Anon update reg_invest"  ON regulatory_investigations FOR UPDATE TO anon   USING (true) WITH CHECK (true);
CREATE POLICY "Auth read reg_invest"    ON regulatory_investigations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert reg_invest"  ON regulatory_investigations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update reg_invest"  ON regulatory_investigations FOR UPDATE TO authenticated USING (true);


-- Ceza ve Karşılık Tahminleri (Predicted Penalties / Provisions)
CREATE TABLE IF NOT EXISTS predicted_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  reference_type text NOT NULL                 -- Ne tür bir ilişki kuruyor? 'CASE' veya 'INVESTIGATION'
    CHECK (reference_type IN ('CASE', 'INVESTIGATION')),
  reference_id uuid NOT NULL,                  -- legal_cases.id veya regulatory_investigations.id
  predicted_loss_prob numeric(5,2) DEFAULT 0,  -- Kaybetme / Ceza Alma Olasılığı (0-100)
  predicted_penalty_amount numeric(15,2) DEFAULT 0, -- Tahmini Ceza Tutarı / Ayrılması Gereken Karşılık
  ai_confidence numeric(5,2) DEFAULT 0,        -- Modelin Güven Skoru
  risk_factors text[],                         -- Risk arttırıcı faktörler (Örn: Emsal Karar Bulunması)
  mitigation_strategy text,                    -- İndirim / Savunma Stratejisi
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pred_penalties_ref ON predicted_penalties(reference_id);

ALTER TABLE predicted_penalties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read penalties"   ON predicted_penalties FOR SELECT TO anon   USING (true);
CREATE POLICY "Anon insert penalties" ON predicted_penalties FOR INSERT TO anon   WITH CHECK (true);
CREATE POLICY "Anon update penalties" ON predicted_penalties FOR UPDATE TO anon   USING (true) WITH CHECK (true);
CREATE POLICY "Auth read penalties"   ON predicted_penalties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert penalties" ON predicted_penalties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update penalties" ON predicted_penalties FOR UPDATE TO authenticated USING (true);
