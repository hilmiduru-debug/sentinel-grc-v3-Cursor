-- ============================================================================
-- WAVE 24: ESG Planet Pulse Seed Data Migration
-- ============================================================================
-- This migration inserts realistic C-Level ESG data for the Turkish banking
-- use-case: esg_frameworks, esg_metric_definitions, esg_data_points,
-- esg_social_metrics, esg_green_assets
-- ============================================================================

-- FRAMEWORKS
INSERT INTO public.esg_frameworks (id, tenant_id, name, version, category, is_active) VALUES
  ('e1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'GRI Standards (Katılım Bankası)', '2021', 'Integrated', true),
  ('e1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'EU Taxonomy (Çevre)', '2022', 'Environmental', true),
  ('e1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'TCFD Finansal İklim', '2023', 'Environmental', true),
  ('e1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'UN SDG Hedefleri', '2030', 'Integrated', true)
ON CONFLICT (id) DO NOTHING;

-- METRIC DEFINITIONS
INSERT INTO public.esg_metric_definitions
  (id, tenant_id, framework_id, code, name, pillar, unit, data_type, target_value, target_direction)
VALUES
  ('e2000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000001',
   'GRI 305-1', 'Kapsam 1 Sera Gazı Emisyonu (Doğrudan)', 'E', 'tCO2e', 'Number', 12000, 'below'),
  ('e2000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000001',
   'GRI 305-2', 'Kapsam 2 Sera Gazı Emisyonu (Satın Alınan Enerji)', 'E', 'tCO2e', 'Number', 8000, 'below'),
  ('e2000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000001',
   'GRI 302-1', 'Toplam Enerji Tüketimi', 'E', 'MWh', 'Number', 45000, 'below'),
  ('e2000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000001',
   'GRI 303-5', 'Su Tüketimi', 'E', 'm³', 'Number', 15000, 'below'),
  ('e2000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000002',
   'EU-TAX-GAR', 'Yeşil Varlık Oranı (GAR)', 'E', '%', 'Percentage', 35, 'above'),
  ('e2000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000001',
   'GRI 405-2', 'Cinsiyet Ücret Farklılığı', 'S', '%', 'Percentage', 5, 'below'),
  ('e2000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000001',
   'GRI 404-1', 'Çalışan Başına Eğitim Saati', 'S', 'saat', 'Number', 40, 'above'),
  ('e2000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000001',
   'GRI 403-9', 'İş Kazası Sayısı', 'S', 'adet', 'Number', 0, 'equal'),
  ('e2000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000001',
   'GRI 205-3', 'Doğrulanan Yolsuzluk Vakası', 'G', 'adet', 'Number', 0, 'equal'),
  ('e2000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000001',
   'GRI 419-1', 'Mevzuat İhlali Cezası', 'G', 'TRY', 'Currency', 0, 'equal'),
  ('e2000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'e1000000-0000-0000-0000-000000000003',
   'TCFD-RISK', 'İklim Riski Limiti Kullanım Oranı', 'G', '%', 'Percentage', 80, 'below')
ON CONFLICT (id) DO NOTHING;

-- DATA POINTS (Q1 2026)
INSERT INTO public.esg_data_points
  (id, tenant_id, metric_id, period, value, previous_value, submitted_by, department,
   ai_validation_status, ai_notes, ai_confidence, snapshot_json, record_hash, is_frozen)
VALUES
  ('e3000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000001', '2026-Q1', 13450, 11200,
   'İklim ve Sürdürülebilirlik Ekibi', 'Kurumsal Yönetim', 'Flagged',
   'UYARI: Kapsam 1 emisyonları %20.1 artmıştır. TCFD limit aşımı tespit edildi. Araç filosu büyümesi belgelenemiyor.',
   62, '{"scope": "direct_combustion"}', 'a1b2c3d4e5f6a7b8', false),
  ('e3000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000002', '2026-Q1', 7320, 7850,
   'Enerji Yönetim Birimi', 'İdari İşler', 'Validated',
   'Satın alınan elektrik emisyonu hedef altında. PPA etkisi doğrulandı.',
   91, '{"renewable_pct": 48}', 'b2c3d4e5f6a7b8c9', true),
  ('e3000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000003', '2026-Q1', 41200, 44100,
   'Enerji Yönetim Birimi', 'İdari İşler', 'Validated',
   'LED dönüşüm projesi sayesinde hedef altında kaldı.', 88, '{}', 'c3d4e5f6a7b8c9d0', true),
  ('e3000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000004', '2026-Q1', 14200, 15800,
   'İdari İşler', 'İdari İşler', 'Validated', null, 85, '{}', 'd4e5f6a7b8c9d0e1', true),
  ('e3000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000005', '2026-Q1', 28.4, 24.1,
   'Sürdürülebilir Finans', 'Hazine & Yatırım', 'Flagged',
   'UYARI: GAR %28.4 ile AB Taksonomisi hedefi olan %35 altında. Transition Finance sınıflandırması yetersiz.',
   55, '{}', 'e5f6a7b8c9d0e1f2', false),
  ('e3000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000006', '2026-Q1', 4.2, 5.8,
   'İnsan Kaynakları', 'İnsan Kaynakları', 'Validated',
   '2025 maaş denge projesi ile cinsiyet ücret uçurumu hedef altına indi.',
   93, '{}', 'f6a7b8c9d0e1f2a3', true),
  ('e3000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000007', '2026-Q1', 47.3, 38.2,
   'İnsan Kaynakları', 'İnsan Kaynakları', 'Validated', null, 90, '{}', 'a7b8c9d0e1f2a3b4', true),
  ('e3000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000008', '2026-Q1', 0, 1,
   'İş Sağlığı ve Güvenliği', 'İnsan Kaynakları', 'Validated', null, 99, '{}', 'b8c9d0e1f2a3b4c5', true),
  ('e3000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000009', '2026-Q1', 0, 0,
   'İç Denetim', 'Risk ve Uyum', 'Validated', null, 98, '{}', 'c9d0e1f2a3b4c5d6', true),
  ('e3000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000010', '2026-Q1', 125000, 0,
   'Hukuk', 'Risk ve Uyum', 'Flagged',
   'UYARI: 125,000 TRY BDDK idari para cezası — KVKK veri işleme ihlali nedeniyle.',
   78, '{"ceza_tipi": "KVKK_ihlali"}', 'd0e1f2a3b4c5d6e7', false),
  ('e3000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111',
   'e2000000-0000-0000-0000-000000000011', '2026-Q1', 62.3, 58.1,
   'Risk Yönetimi', 'Risk ve Uyum', 'Validated',
   'İklim senaryosu (RCP 2.6/4.5) analizleri güncellendi, limit eşiği altında.',
   84, '{}', 'e1f2a3b4c5d6e7f8', true)
ON CONFLICT (id) DO NOTHING;

-- SOCIAL METRICS
INSERT INTO public.esg_social_metrics
  (id, tenant_id, period, total_employees, women_total, women_management, women_board,
   gender_pay_gap_pct, training_hours_per_employee, employee_turnover_pct, workplace_injuries, community_investment_try)
VALUES
  ('e4000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2025-Q2', 4820, 2168, 621, 3, 5.8, 34.2, 9.4, 1, 2800000),
  ('e4000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '2025-Q3', 4890, 2201, 638, 3, 5.5, 36.8, 8.9, 0, 3200000),
  ('e4000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '2025-Q4', 4950, 2228, 652, 3, 5.1, 40.5, 8.2, 1, 3500000),
  ('e4000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '2026-Q1', 5020, 2284, 681, 4, 4.2, 47.3, 7.8, 0, 4100000)
ON CONFLICT (id) DO NOTHING;

-- GREEN ASSETS
INSERT INTO public.esg_green_assets
  (id, tenant_id, period, total_loan_portfolio_try, green_loans_try, green_bonds_try, taxonomy_aligned_pct, transition_finance_try)
VALUES
  ('e5000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2025-Q2', 42000000000, 8400000000, 3200000000, 24.1, 1500000000),
  ('e5000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '2025-Q3', 44500000000, 9500000000, 3800000000, 25.8, 1800000000),
  ('e5000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '2025-Q4', 46800000000, 11200000000, 4500000000, 27.1, 2100000000),
  ('e5000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '2026-Q1', 48200000000, 12900000000, 5800000000, 28.4, 2500000000)
ON CONFLICT (id) DO NOTHING;
