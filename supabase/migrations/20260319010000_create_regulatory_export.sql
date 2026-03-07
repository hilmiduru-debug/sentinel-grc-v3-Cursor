-- =============================================================================
-- Wave 26: Regulatory Export — BDDK & Düzenleyici Kurum Dosyası
-- =============================================================================

-- Dossier paketlerinin kayıtlı meta verileri
CREATE TABLE IF NOT EXISTS regulatory_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  dossier_ref text NOT NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'BDDK' CHECK (type IN ('BDDK', 'SPK', 'MASAK', 'KVKK', 'OTHER')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GENERATED', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  engagement_id uuid REFERENCES audit_engagements(id) ON DELETE SET NULL,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  package_path text,
  notes text DEFAULT '',
  exported_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_dossiers_tenant ON regulatory_dossiers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_dossiers_status ON regulatory_dossiers(status);
CREATE INDEX IF NOT EXISTS idx_regulatory_dossiers_type ON regulatory_dossiers(type);

ALTER TABLE regulatory_dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon and authenticated can read regulatory_dossiers"
  ON regulatory_dossiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert regulatory_dossiers"
  ON regulatory_dossiers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update regulatory_dossiers"
  ON regulatory_dossiers FOR UPDATE TO authenticated USING (true);

-- Export işlemlerinin detaylı log tablosu
CREATE TABLE IF NOT EXISTS export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  dossier_id uuid REFERENCES regulatory_dossiers(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT 'GENERATE' CHECK (action IN ('GENERATE', 'SUBMIT', 'DOWNLOAD', 'REVOKE')),
  status text NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_dossier ON export_logs(dossier_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_tenant ON export_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_created ON export_logs(created_at DESC);

ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon and authenticated can read export_logs"
  ON export_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert export_logs"
  ON export_logs FOR INSERT TO authenticated WITH CHECK (true);
