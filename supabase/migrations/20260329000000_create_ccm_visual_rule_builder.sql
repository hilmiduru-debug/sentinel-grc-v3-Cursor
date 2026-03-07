-- ============================================================
-- Wave 52: Visual CCM Rule Builder
-- Migration: 20260329000000
-- Tables: ccm_visual_rules, rule_nodes
-- ============================================================

-- 1. Görsel CCM Kural Tanımları (graph metadata)
CREATE TABLE IF NOT EXISTS ccm_visual_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code       TEXT NOT NULL UNIQUE,        -- Örn: "VR-AML-001"
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'AML'
                    CHECK (category IN ('AML','FRAUD','OPERATIONAL','REGULATORY','BENFORD','STRUCTURING')),
  severity        TEXT NOT NULL DEFAULT 'HIGH'
                    CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  -- React Flow Graf: nodes ve edges JSON olarak saklanır
  nodes_json      JSONB NOT NULL DEFAULT '[]',
  edges_json      JSONB NOT NULL DEFAULT '[]',
  -- Kural motoru için derlenmiş boolean ifade
  compiled_logic  TEXT,
  -- Test sonuçları
  last_tested_at  TIMESTAMPTZ,
  last_test_result TEXT,  -- 'PASS' | 'FAIL' | 'ERROR'
  -- Versiyon kontrolü
  version         INTEGER NOT NULL DEFAULT 1,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Kural Düğüm Kataloğu (yeniden kullanılabilir node tipleri)
CREATE TABLE IF NOT EXISTS rule_nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type       TEXT NOT NULL,               -- 'CONDITION' | 'ACTION' | 'AGGREGATOR' | 'TRIGGER'
  node_subtype    TEXT NOT NULL,               -- Örn: 'AMOUNT_THRESHOLD', 'TIME_WINDOW', 'GEO_CHECK'
  label           TEXT NOT NULL,
  description     TEXT,
  icon            TEXT,                        -- Lucide icon adı
  color_scheme    TEXT NOT NULL DEFAULT 'blue',
  -- Düğümün beklediği input parametreler şeması
  config_schema   JSONB NOT NULL DEFAULT '{}',
  -- Düğümün ürettiği output tipi
  output_type     TEXT NOT NULL DEFAULT 'BOOLEAN',
  is_terminal     BOOLEAN NOT NULL DEFAULT FALSE,  -- Action node ise TRUE
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Kural Çalıştırma Logları (bir kuralın ne zaman tetiklendiği)
CREATE TABLE IF NOT EXISTS rule_execution_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id         UUID NOT NULL REFERENCES ccm_visual_rules(id) ON DELETE CASCADE,
  rule_code       TEXT NOT NULL,
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  input_record_id TEXT,                        -- İncelenen kayıt ID
  input_record_type TEXT,                      -- 'TRANSACTION' | 'INVOICE' | 'HR'
  result          TEXT NOT NULL DEFAULT 'NO_MATCH'
                    CHECK (result IN ('MATCH','NO_MATCH','ERROR')),
  matched_nodes   TEXT[],                      -- Tetiklenen düğüm id'leri
  risk_score_generated INTEGER,               -- 0-100
  alert_generated BOOLEAN NOT NULL DEFAULT FALSE,
  error_detail    TEXT
);

-- 4. İndeksler
CREATE INDEX IF NOT EXISTS idx_ccm_rules_active    ON ccm_visual_rules(is_active, category);
CREATE INDEX IF NOT EXISTS idx_ccm_rules_severity  ON ccm_visual_rules(severity, is_active);
CREATE INDEX IF NOT EXISTS idx_rule_nodes_type     ON rule_nodes(node_type, node_subtype);
CREATE INDEX IF NOT EXISTS idx_rule_exec_logs_rule ON rule_execution_logs(rule_id, triggered_at DESC);

-- 5. RLS Kapalı
ALTER TABLE ccm_visual_rules      DISABLE ROW LEVEL SECURITY;
ALTER TABLE rule_nodes            DISABLE ROW LEVEL SECURITY;
ALTER TABLE rule_execution_logs   DISABLE ROW LEVEL SECURITY;
