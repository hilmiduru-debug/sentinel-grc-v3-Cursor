-- =============================================================================
-- Wave 70: Smart Contract & Digital Asset Ledger Audit — DDL Only
-- Akıllı Sözleşme ve Dijital Varlık Denetimi
-- =============================================================================

-- Akıllı Sözleşmeler (Smart Contracts)
CREATE TABLE IF NOT EXISTS smart_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  contract_name text NOT NULL,                 -- Örn: Dijital Sukuk İhracı
  network text NOT NULL,                       -- Örn: Ethereum, Polygon, Quorum
  contract_address text NOT NULL,              -- Örn: 0x1234...abcd
  solidity_version text NOT NULL DEFAULT '0.8.20',
  description text,
  audit_status text NOT NULL DEFAULT 'Pending'
    CHECK (audit_status IN ('Pending', 'Scanning', 'Audited', 'Critical Risk')),
  risk_score numeric(5,2) DEFAULT 0.00,        -- 0-100 arası AI Risk Skoru
  deployment_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_contracts_tenant ON smart_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_status ON smart_contracts(audit_status);

ALTER TABLE smart_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read contracts"    ON smart_contracts FOR SELECT TO anon   USING (true);
CREATE POLICY "Anon insert contracts"  ON smart_contracts FOR INSERT TO anon   WITH CHECK (true);
CREATE POLICY "Anon update contracts"  ON smart_contracts FOR UPDATE TO anon   USING (true) WITH CHECK (true);
CREATE POLICY "Auth read contracts"    ON smart_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert contracts"  ON smart_contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update contracts"  ON smart_contracts FOR UPDATE TO authenticated USING (true);


-- Dijital Varlık (Token) İhraçları
CREATE TABLE IF NOT EXISTS token_issuances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL
    REFERENCES smart_contracts(id) ON DELETE CASCADE,
  token_name text NOT NULL,                    -- Örn: Sentinel Gold Token (SGT)
  token_symbol text NOT NULL,
  total_supply numeric(24,4) NOT NULL DEFAULT 0,
  issuance_date date,
  regulatory_compliance text NOT NULL DEFAULT 'Unknown'
    CHECK (regulatory_compliance IN ('Compliant', 'Non-Compliant', 'Pending Review', 'Unknown')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_issuances_contract ON token_issuances(contract_id);

ALTER TABLE token_issuances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read tokens"    ON token_issuances FOR SELECT TO anon   USING (true);
CREATE POLICY "Anon insert tokens"  ON token_issuances FOR INSERT TO anon   WITH CHECK (true);
CREATE POLICY "Anon update tokens"  ON token_issuances FOR UPDATE TO anon   USING (true) WITH CHECK (true);
CREATE POLICY "Auth read tokens"    ON token_issuances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert tokens"  ON token_issuances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update tokens"  ON token_issuances FOR UPDATE TO authenticated USING (true);


-- Sözleşme Zafiyetleri (Vulnerabilities - Örn: Reentrancy, Flash Loan)
CREATE TABLE IF NOT EXISTS contract_vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL
    REFERENCES smart_contracts(id) ON DELETE CASCADE,
  vulnerability_type text NOT NULL,            -- Örn: Reentrancy, Integer Overflow
  severity text NOT NULL DEFAULT 'Medium'
    CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  description text NOT NULL,                   -- Zafiyetin açıklaması
  code_snippet text,                           -- Zafiyetli kod parçacığı (Örn: sendValue())
  line_number integer,                         -- Etkilenen satır numarası
  remediation_plan text,                       -- Çözüm önerisi (Örn: check-effects-interactions pattern)
  status text NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Accepted Risk')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_vuln_contract ON contract_vulnerabilities(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_vuln_severity ON contract_vulnerabilities(severity);

ALTER TABLE contract_vulnerabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read contract_vuln"   ON contract_vulnerabilities FOR SELECT TO anon   USING (true);
CREATE POLICY "Anon insert contract_vuln" ON contract_vulnerabilities FOR INSERT TO anon   WITH CHECK (true);
CREATE POLICY "Anon update contract_vuln" ON contract_vulnerabilities FOR UPDATE TO anon   USING (true) WITH CHECK (true);
CREATE POLICY "Auth read contract_vuln"   ON contract_vulnerabilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert contract_vuln" ON contract_vulnerabilities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update contract_vuln" ON contract_vulnerabilities FOR UPDATE TO authenticated USING (true);
