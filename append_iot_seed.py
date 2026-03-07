import sys

seed_sql = """
-- ============================================================
-- Wave 77 Seed: IoT Vault & Cyber-Physical Auditor
-- Isı/Nem Sensörleri, Biyometrik Erişimler ve İhlal Alarmları
-- ============================================================

-- IoT Sensör Okumaları
INSERT INTO iot_sensors (
  sensor_uuid, location_name, sensor_type,
  temperature_c, humidity_pct, door_status, motion_detected, is_online, battery_pct
) VALUES
  ('SENS-IST-DC-01', 'Genel Müdürlük - Sistem Odası', 'TEMP_HUMIDITY', 21.5, 45, NULL, NULL, TRUE, 100),
  ('SENS-IST-DC-02', 'Şube 342 - Sistem Odası', 'TEMP_HUMIDITY', 34.2, 82, NULL, NULL, TRUE, 85),
  ('SENS-IST-DC-03', 'Şube 342 - Sistem Odası Kapı', 'DOOR_CONTACT', NULL, NULL, 'OPEN', TRUE, TRUE, 90),
  ('SENS-ANK-VLT-01', 'Ankara Şube - Kasa Dairesi', 'MOTION', NULL, NULL, 'CLOSED', FALSE, TRUE, 98),
  ('SENS-ANK-VLT-SMK', 'Ankara Şube - Kasa Dairesi', 'SMOKE', NULL, NULL, NULL, FALSE, TRUE, 100)
ON CONFLICT (sensor_uuid) DO NOTHING;

-- Biyometrik / Kartlı Geçiş Logları
INSERT INTO vault_access_logs (
  location_name, access_point, personnel_id, personnel_name,
  access_status, auth_method, access_time
) VALUES
  ('Genel Müdürlük - Sistem Odası', 'Turnike 1', 'P-1204', 'Ahmet Yılmaz (Sistem Yöneticisi)', 'GRANTED', 'BIOMETRIC', '2026-04-05 08:30:00+03'),
  ('Şube 342 - Sistem Odası', 'Güvenlik Kapısı', 'UNKNOWN', 'Bilinmeyen Şahıs', 'DENIED', 'RFID_CARD', '2026-04-05 09:12:00+03'),
  ('Ankara Şube - Kasa Dairesi', 'Kasa Girişi', 'P-4492', 'Ayşe Demir (Şube Müdürü)', 'GRANTED', 'BIOMETRIC', '2026-04-05 10:00:00+03')
ON CONFLICT DO NOTHING;

-- Fiziksel Güvenlik Alarmları (Cyber-Physical Breaches)
INSERT INTO physical_breaches (
  breach_code, location_name, severity, breach_type,
  description, trigger_sensor, status, event_time
) VALUES
  (
    'PHY-2026-001', 'Şube 342 - Sistem Odası', 'CRITICAL', 'ENVIRONMENTAL',
    'Şube 342 Sistem Odası Isı %80''i aştı. Sunucu donanımları erime tehlikesi altında. İklimlendirme (HVAC) sistem arızası.',
    'SENS-IST-DC-02', 'OPEN', '2026-04-05 09:15:00+03'
  ),
  (
    'PHY-2026-002', 'Şube 342 - Sistem Odası', 'HIGH', 'UNAUTHORIZED_ACCESS',
    'Zorlama Girişim - Tanımsız RFID kart master kapıda üst üste 3 kez okutuldu. Sistem odası kapı sensörü şu an (AÇIK) durumunda.',
    'SENS-IST-DC-03', 'INVESTIGATING', '2026-04-05 09:12:05+03'
  ),
  (
    'PHY-2026-003', 'Ankara Şube - Kasa Dairesi', 'LOW', 'SENSOR_OFFLINE',
    'Hareket sensörü 3 saattir veri göndermiyor. Pil değişimi veya ağ kontrolü gerekiyor.',
    'SENS-ANK-VLT-01', 'RESOLVED', '2026-04-04 14:00:00+03'
  )
ON CONFLICT (breach_code) DO NOTHING;
"""

with open('supabase/seed.sql', 'a') as f:
    f.write(seed_sql)

print("Cyber-Physical Auditor seed appended successfully")
