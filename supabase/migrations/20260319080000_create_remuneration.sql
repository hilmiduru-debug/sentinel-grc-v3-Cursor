-- =============================================================================
-- Wave 65: Executive Remuneration & Clawback Tracker — DDL Only
-- Üst Yönetim Ücretlendirme ve Prim İptal İzleyicisi (Yönetişim)
-- =============================================================================

-- Üst Düzey Yönetici Prim ve Performans Havuzu (Executive Bonuses)
CREATE TABLE IF NOT EXISTS executive_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  executive_name text NOT NULL,                -- Yönetici Adı (Örn: Hakan Yılmaz)
  title text NOT NULL,                         -- Ünvanı (Örn: Kurumsal Krediler Direktörü)
  department text NOT NULL,                    -- Departman
  performance_year integer NOT NULL,           -- Performans Yılı (Örn: 2025)
  base_salary numeric(15,2) DEFAULT 0,         -- Sabit Maaş
  target_bonus numeric(15,2) DEFAULT 0,        -- Hedeflenen Prim
  awarded_bonus numeric(15,2) DEFAULT 0,       -- Hak Edilen Prim
  deferred_amount numeric(15,2) DEFAULT 0,     -- Ertelenmiş Prim Tutarı (Malus / Clawback riski altında)
  vesting_date date,                           -- Hak Ediş (Vesting) Tarihi
  risk_adjusted_rating text DEFAULT 'A'        -- Risk-Odaklı Performans Notu (Örn: A, B+, C-)
    CHECK (risk_adjusted_rating IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'C-', 'D')),
  status text NOT NULL DEFAULT 'Tahakkuk Edildi'
    CHECK (status IN ('Taslak', 'Tahakkuk Edildi', 'Kısmen Ödendi', 'Ödendi', 'İptal Edildi (Clawback)')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exec_bonus_tenant ON executive_bonuses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exec_bonus_status ON executive_bonuses(status);
CREATE INDEX IF NOT EXISTS idx_exec_bonus_year   ON executive_bonuses(performance_year);

ALTER TABLE executive_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read exec_bonus"    ON executive_bonuses FOR SELECT TO anon   USING (true);
CREATE POLICY "Anon insert exec_bonus"  ON executive_bonuses FOR INSERT TO anon   WITH CHECK (true);
CREATE POLICY "Anon update exec_bonus"  ON executive_bonuses FOR UPDATE TO anon   USING (true) WITH CHECK (true);
CREATE POLICY "Auth read exec_bonus"    ON executive_bonuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert exec_bonus"  ON executive_bonuses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update exec_bonus"  ON executive_bonuses FOR UPDATE TO authenticated USING (true);


-- Prim İptal / Geri Alma (Clawback & Malus) Olayları
CREATE TABLE IF NOT EXISTS clawback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  bonus_id uuid NOT NULL
    REFERENCES executive_bonuses(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,                 -- İptali Tetikleyen Olay (Örn: Aşırı Riskli NPL Portföyü)
  trigger_date date NOT NULL DEFAULT CURRENT_DATE,
  clawback_amount numeric(15,2) NOT NULL DEFAULT 0, -- İptal Edilen/Geri İstenen Tutar
  justification text NOT NULL DEFAULT '',      -- Kurul Gerekçesi
  board_resolution_ref text DEFAULT '',        -- YK Karar No (Örn: YK-2026/045)
  recovery_status text NOT NULL DEFAULT 'İncelemede'
    CHECK (recovery_status IN ('İncelemede', 'Karara Bağlandı', 'Tahsil Edildi', 'Hukuki Süreçte')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clawback_bonus  ON clawback_events(bonus_id);
CREATE INDEX IF NOT EXISTS idx_clawback_status ON clawback_events(recovery_status);

ALTER TABLE clawback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read clawback"   ON clawback_events FOR SELECT TO anon   USING (true);
CREATE POLICY "Anon insert clawback" ON clawback_events FOR INSERT TO anon   WITH CHECK (true);
CREATE POLICY "Anon update clawback" ON clawback_events FOR UPDATE TO anon   USING (true) WITH CHECK (true);
CREATE POLICY "Auth read clawback"   ON clawback_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert clawback" ON clawback_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update clawback" ON clawback_events FOR UPDATE TO authenticated USING (true);
