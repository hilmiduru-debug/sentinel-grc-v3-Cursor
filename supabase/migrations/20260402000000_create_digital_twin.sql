-- ============================================================
-- Wave 66: Enterprise Digital Twin & Process Mining
-- Migration: 20260402000000
-- Tables: digital_twin_models, process_mining_logs
-- ============================================================

-- 1. Dijital İkiz Süreç Modelleri (Prosedürdeki İdeal Akışlar)
CREATE TABLE IF NOT EXISTS digital_twin_models (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_code    TEXT NOT NULL UNIQUE,          -- Örn: "PROC-CREDIT-001"
  name            TEXT NOT NULL,
  department      TEXT NOT NULL,
  owner           TEXT NOT NULL,
  -- İdeal Süreç Şema Tasarımı (React Flow Nodes/Edges JSON)
  nodes_json      JSONB NOT NULL DEFAULT '[]',
  edges_json      JSONB NOT NULL DEFAULT '[]',
  ideal_steps     INTEGER NOT NULL DEFAULT 0,    -- Prosedürde olması gereken toplam adım sayısı
  ideal_duration_hours NUMERIC(10,2),            -- İdeal tamamlanma süresi (SLA)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Süreç Madenciliği Logları (Gerçekleşen Vakalar / Case Logs)
CREATE TABLE IF NOT EXISTS process_mining_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id            UUID NOT NULL REFERENCES digital_twin_models(id) ON DELETE CASCADE,
  case_id             TEXT NOT NULL UNIQUE,          -- Örn: "CREDIT-APP-2026-99932"
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ,
  actual_steps        INTEGER NOT NULL DEFAULT 0,    -- Gerçekte izlenen adım sayısı
  actual_duration_hrs NUMERIC(10,2),                 -- Sürecin fiili süresi
  -- Uyum ve Bypass Tespiti
  compliance_status   TEXT NOT NULL DEFAULT 'COMPLIANT'
                        CHECK (compliance_status IN ('COMPLIANT','MINOR_DEVIATION','BYPASS_DETECTED','BOTTLENECK')),
  bypass_details      TEXT,                          -- Atlanılan kontroller (Örn: "D-2: İstihbarat Kontrolü yapılmadı")
  bottleneck_node_id  TEXT,                          -- Darboğaz yaşanan düğüm ID'si
  risk_score          INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  -- Vaka Sorumlusu
  handled_by          TEXT,
  is_audited          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. İndeksler
CREATE INDEX IF NOT EXISTS idx_digital_twin_active ON digital_twin_models(is_active);
CREATE INDEX IF NOT EXISTS idx_process_logs_case   ON process_mining_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_process_logs_status ON process_mining_logs(compliance_status, risk_score DESC);

-- 4. RLS Kapalı
ALTER TABLE digital_twin_models   DISABLE ROW LEVEL SECURITY;
ALTER TABLE process_mining_logs   DISABLE ROW LEVEL SECURITY;
