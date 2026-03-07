-- =============================================================================
-- WAVE 64: Data Privacy & PII Flow Mapper (KVKK/GDPR Flow Tracker)
-- =============================================================================
-- Tables:
--   pii_data_flows     — tracks data sources, destinations, types, and encryption
--   consent_records    — metadata about compliance consent (GDPR/KVKK)
--   privacy_breaches   — data breach incidents (exfiltration, accidental exposure)
-- =============================================================================

-- 1. PII DATA FLOWS — Kişisel Veri Akış Haritası
CREATE TABLE IF NOT EXISTS public.pii_data_flows (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  system_source       text NOT NULL,                   -- Ör: CRM
  system_destination  text NOT NULL,                   -- Ör: External Cloud Analytics
  data_categories     text[] NOT NULL DEFAULT '{}',    -- Ör: ['Kimlik', 'Finansal', 'Sağlık']
  transfer_method     text NOT NULL DEFAULT 'API',
  is_encrypted        boolean NOT NULL DEFAULT false,
  is_cross_border     boolean NOT NULL DEFAULT false,  -- Yurtdışı aktarım (KVKK kritik)
  legal_basis         text NOT NULL DEFAULT 'EXPLICIT_CONSENT', -- Açık Rıza, Kanuni Zorunluluk vb.
  risk_level          text NOT NULL DEFAULT 'MEDIUM'
    CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  last_review_at      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pii_data_flows_tenant ON public.pii_data_flows(tenant_id);
ALTER TABLE public.pii_data_flows DISABLE ROW LEVEL SECURITY;

-- 2. CONSENT RECORDS — İzin/Açık Rıza Envanteri (Aggregate Data)
CREATE TABLE IF NOT EXISTS public.consent_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  context             text NOT NULL,                  -- Ör: Marketing, Third-Party Sharing
  total_users         integer NOT NULL DEFAULT 0,
  consented_users     integer NOT NULL DEFAULT 0,
  revoked_users       integer NOT NULL DEFAULT 0,
  measured_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_tenant ON public.consent_records(tenant_id);
ALTER TABLE public.consent_records DISABLE ROW LEVEL SECURITY;

-- 3. PRIVACY BREACHES — İhlal ve Sızıntı Kayıtları
CREATE TABLE IF NOT EXISTS public.privacy_breaches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  incident_title      text NOT NULL,
  description         text,
  affected_records    integer NOT NULL DEFAULT 0,
  affected_data_types text[] NOT NULL DEFAULT '{}',
  severity            text NOT NULL DEFAULT 'HIGH'
    CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status              text NOT NULL DEFAULT 'INVESTIGATING'
    CHECK (status IN ('OPEN', 'INVESTIGATING', 'MITIGATED', 'REPORTED_TO_DPA', 'CLOSED')),
  detected_at         timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_privacy_breaches_tenant ON public.privacy_breaches(tenant_id);
ALTER TABLE public.privacy_breaches DISABLE ROW LEVEL SECURITY;
