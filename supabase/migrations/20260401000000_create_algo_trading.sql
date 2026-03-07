-- ============================================================
-- Wave 63: Algo-Trading & Flash Crash Sentinel
-- Migration: 20260401000000
-- Tables: algo_trading_logs, market_manipulation_alerts
-- ============================================================

-- 1. Yüksek Frekanslı Algoritmik İşlem Logları (HFT / Algo-Trading)
CREATE TABLE IF NOT EXISTS algo_trading_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_code        TEXT NOT NULL UNIQUE,            -- Örn: "TRD-USDTRY-20260401-001"
  desk              TEXT NOT NULL DEFAULT 'FX_DESK'
                      CHECK (desk IN ('FX_DESK','RATES_DESK','EQUITY_DESK','COMMODITY_DESK')),
  instrument        TEXT NOT NULL,                   -- Örn: "USD/TRY", "EUR/USD", "XAU/USD"
  order_type        TEXT NOT NULL DEFAULT 'LIMIT'
                      CHECK (order_type IN ('LIMIT','MARKET','STOP','ICEBERG','FAK','FOK')),
  side              TEXT NOT NULL CHECK (side IN ('BUY','SELL')),
  price             NUMERIC(18,5) NOT NULL CHECK (price > 0),    -- Hassas fiyatlama için 5 ondalık
  volume            NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (volume >= 0),
  -- Algoritma Metadataları
  algo_strategy_id  TEXT,                            -- Örn: "VWAP-BOT-1", "ARBITRAGE-09"
  execution_ms      INTEGER NOT NULL DEFAULT 0,      -- Emrin gerçekleşme/iletilme süresi (milisaniye)
  is_canceled       BOOLEAN NOT NULL DEFAULT FALSE,
  -- Zaman Damgası (HFT analizi için çok kritik)
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Piyasa Manipülasyonu ve Flash Crash Alarmları (Market Risk Alerts)
CREATE TABLE IF NOT EXISTS market_manipulation_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_code        TEXT NOT NULL UNIQUE,            -- Örn: "MAL-2026-001"
  detection_time    TIMESTAMPTZ NOT NULL DEFAULT now(),
  anomaly_type      TEXT NOT NULL DEFAULT 'SPOOFING'
                      CHECK (anomaly_type IN ('SPOOFING','LAYERING','WASH_TRADING','FLASH_CRASH','QUOTE_STUFFING','MOMENTUM_IGNITION')),
  instrument        TEXT NOT NULL,
  severity          TEXT NOT NULL DEFAULT 'HIGH'
                      CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  -- Risk Detayları
  description       TEXT NOT NULL,
  affected_volume   NUMERIC(18,2) NOT NULL DEFAULT 0,
  triggering_algo   TEXT,                            -- Şüpheli algo bot ID'si
  -- Aksiyon & Statü
  status            TEXT NOT NULL DEFAULT 'OPEN'
                      CHECK (status IN ('OPEN','INVESTIGATING','FALSE_POSITIVE','REPORTED_TO_REGULATOR','RESOLVED')),
  investigator      TEXT,
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. İndeksler (HFT verileri için zaman bazlı indeksler kritik)
CREATE INDEX IF NOT EXISTS idx_algo_logs_instrument_time ON algo_trading_logs(instrument, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_algo_logs_desk          ON algo_trading_logs(desk, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_algo_alerts_status      ON market_manipulation_alerts(status, severity);

-- 4. RLS Kapalı
ALTER TABLE algo_trading_logs          DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_manipulation_alerts DISABLE ROW LEVEL SECURITY;
