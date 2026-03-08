-- =============================================================================
-- Wave 68: Zero-Knowledge Ethics Vault (ZKP Whistleblower)
-- =============================================================================

-- 1. zkp_encrypted_reports — Şifrelenmiş Etik İhbar Raporları Kasası
CREATE TABLE IF NOT EXISTS public.zkp_encrypted_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
  tracking_code       TEXT NOT NULL UNIQUE,       -- 'ZKP-8822-ABCD', anonim takip kodu
  category            TEXT NOT NULL,              -- 'rüşvet_yolsuzluk', 'mobbing', 'cinsel_taciz', 'finansal_usulsüzlük'
  severity            TEXT NOT NULL DEFAULT 'high', -- 'critical', 'high', 'medium', 'low'
  encrypted_payload   TEXT NOT NULL,              -- İhbarın ana metni ve kanıt linkleri (AES-256 / RSA şifreli string)
  zk_proof_hash       TEXT NOT NULL,              -- İhbarın değiştirilmediğine dair Zero-Knowledge Proof hash değeri
  status              TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'reviewing', 'investigating', 'resolved', 'dismissed'
  assigned_investigator TEXT,                     -- Gerekirse atanan denetçi (isim)
  decryption_attempts INTEGER NOT NULL DEFAULT 0, -- Kasayı açma (deşifre) denemesi
  last_decrypted_at   TIMESTAMPTZ,                -- En son ne zaman deşifre edilip okundu
  last_decrypted_by   TEXT,                       -- Kim tarafından okundu (log amaçlı)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. vault_access_logs — Kasa Erişim ve Deşifre Logları
CREATE TABLE IF NOT EXISTS public.vault_access_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
  report_id           UUID NOT NULL REFERENCES public.zkp_encrypted_reports(id) ON DELETE CASCADE,
  accessed_by_role    TEXT NOT NULL,              -- 'CAE', 'Ethics_Committee', 'System_Admin'
  accessed_by_email   TEXT NOT NULL,
  access_reason       TEXT,                       -- 'Ön İnceleme', 'Soruşturma Başlatma' vs.
  access_status       TEXT NOT NULL DEFAULT 'success', -- 'success', 'denied', 'key_mismatch'
  ip_address          TEXT,
  accessed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zkp_reports_tenant ON public.zkp_encrypted_reports(tenant_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_vault_logs_report  ON public.vault_access_logs(report_id, accessed_at DESC);

-- RLS Policies
ALTER TABLE public.zkp_encrypted_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_access_logs     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zkp_reports_access"
  ON public.zkp_encrypted_reports FOR ALL TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);

CREATE POLICY "vault_logs_access"
  ON public.vault_access_logs FOR ALL TO authenticated
  USING (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID)
  WITH CHECK (tenant_id = '11111111-1111-1111-1111-111111111111'::UUID);
