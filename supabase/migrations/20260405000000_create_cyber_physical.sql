-- ============================================================
-- Wave 77: IoT Vault & Cyber-Physical Auditor
-- Migration: 20260405000000
-- Tables: iot_sensors, vault_access_logs, physical_breaches
-- ============================================================

-- 1. IoT Sensör Verileri (Sistem Odası, Kasa Dairesi Isı/Nem/Kapı durumu)
CREATE TABLE IF NOT EXISTS iot_sensors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_uuid     TEXT NOT NULL UNIQUE,          -- Örn: "SENS-IST-DC-01"
  location_name   TEXT NOT NULL,                 -- Örn: "Sistem Odası - İstanbul Merkz", "Şube 342 Kasa Dairesi"
  sensor_type     TEXT NOT NULL DEFAULT 'TEMP_HUMIDITY'
                    CHECK (sensor_type IN ('TEMP_HUMIDITY','DOOR_CONTACT','MOTION','SMOKE','WATER_LEAK')),
  -- Mevcut Okumalar
  temperature_c   NUMERIC(5,2),                  -- Celcius (örn: 22.5)
  humidity_pct    INTEGER CHECK (humidity_pct BETWEEN 0 AND 100),
  door_status     TEXT CHECK (door_status IN ('OPEN','CLOSED','FORCED_OPEN')),
  motion_detected BOOLEAN,
  -- Limitler ve Durum
  is_online       BOOLEAN NOT NULL DEFAULT TRUE,
  battery_pct     INTEGER DEFAULT 100 CHECK (battery_pct BETWEEN 0 AND 100),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Kasa Dairesi & Sistem Odası Erişim Logları (Access Control)
CREATE TABLE IF NOT EXISTS vault_access_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name   TEXT NOT NULL,                 
  access_point    TEXT NOT NULL,                 -- Örn: "Ana Kapı Turnike", "Kasa Dairesi Biyometrik"
  personnel_id    TEXT NOT NULL,                 -- Kart No / Personel Sicil
  personnel_name  TEXT NOT NULL,
  access_time     TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_status   TEXT NOT NULL DEFAULT 'GRANTED'
                    CHECK (access_status IN ('GRANTED','DENIED','TAILGATING_SUSPECTED')),
  auth_method     TEXT NOT NULL DEFAULT 'RFID_CARD'
                    CHECK (auth_method IN ('RFID_CARD','BIOMETRIC','PIN','MANUAL_OVERRIDE')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Fiziksel Güvenlik İhlal Alarmları (Physical Breaches)
CREATE TABLE IF NOT EXISTS physical_breaches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_code     TEXT NOT NULL UNIQUE,          -- Örn: "PHY-2026-001"
  location_name   TEXT NOT NULL,
  event_time      TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity        TEXT NOT NULL DEFAULT 'HIGH'
                    CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  breach_type     TEXT NOT NULL 
                    CHECK (breach_type IN ('ENVIRONMENTAL','UNAUTHORIZED_ACCESS','SENSOR_OFFLINE','FORCED_ENTRY')),
  description     TEXT NOT NULL,                 -- Örn: "Şube 342 Sistem Odası Isı %80'i aştı."
  trigger_sensor  TEXT,                          -- alarmı veren sensor_uuid
  status          TEXT NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','FALSE_ALARM')),
  resolved_by     TEXT,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. İndeksler
CREATE INDEX IF NOT EXISTS idx_iot_sensors_loc    ON iot_sensors(location_name);
CREATE INDEX IF NOT EXISTS idx_access_logs_time   ON vault_access_logs(access_time DESC);
CREATE INDEX IF NOT EXISTS idx_breaches_status    ON physical_breaches(status, severity);

-- 5. RLS Kapalı
ALTER TABLE iot_sensors         DISABLE ROW LEVEL SECURITY;
ALTER TABLE vault_access_logs   DISABLE ROW LEVEL SECURITY;
ALTER TABLE physical_breaches   DISABLE ROW LEVEL SECURITY;
