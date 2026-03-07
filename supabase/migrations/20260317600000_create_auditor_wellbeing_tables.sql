/*
  # Wave 74: Auditor Well-Being & Burnout Predictor

  ## Tablolar
  1. `auditor_workload_logs`   — Müfettişlerin haftalık/aylık mesai ve proje yükü verileri (İK entegrasyonu simülasyonu).
  2. `burnout_risk_scores`    — Analitik motor tarafından hesaplanan tükenmişlik veya stres risk sınırları.
*/

-- ============================================================
-- 1. auditor_workload_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auditor_workload_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'::uuid,
  auditor_id          uuid        NOT NULL, -- Normalde auth.users veya profiles tablosuna referans olabilir
  auditor_name        text        NOT NULL,
  period              text        NOT NULL, -- Örn: '2026-W10', '2026-03'
  total_projects      integer     NOT NULL DEFAULT 1,
  available_hours     numeric     NOT NULL DEFAULT 40, -- Haftalık/Aylık standart beklenen efor
  logged_hours        numeric     NOT NULL DEFAULT 0,  -- Gerçekleşen efor
  travel_days         integer     NOT NULL DEFAULT 0,  -- Görev yeri dışı seyahat gün sayısı
  complexity_factor   numeric     NOT NULL DEFAULT 1.0, -- Atanan işlerin zorluk derecesi (1.0 = normal, 1.5 = çok zor)
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workload_logs_tenant ON public.auditor_workload_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workload_logs_auditor ON public.auditor_workload_logs(auditor_id);
ALTER TABLE public.auditor_workload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workload_logs: auth read"   ON public.auditor_workload_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "workload_logs: auth write"  ON public.auditor_workload_logs FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "workload_logs: anon read"   ON public.auditor_workload_logs FOR SELECT TO anon          USING (true);
CREATE POLICY "workload_logs: anon insert" ON public.auditor_workload_logs FOR INSERT TO anon          WITH CHECK (true);

-- ============================================================
-- 2. burnout_risk_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.burnout_risk_scores (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'::uuid,
  auditor_id          uuid        NOT NULL,
  auditor_name        text        NOT NULL,
  department          text        NOT NULL DEFAULT 'İç Denetim',
  risk_score          numeric     NOT NULL DEFAULT 0,  -- (0-100 arası; >75 = CRITICAL)
  overtime_percentage numeric     NOT NULL DEFAULT 0,  -- Fazla mesai yüzdesi
  risk_status         text        NOT NULL DEFAULT 'NORMAL'
                      CHECK (risk_status IN ('NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL')),
  ai_recommendation   text,       -- Örn. "2 hafta zorunlu izin önerilir"
  last_calculated_at  timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_burnout_scores_tenant ON public.burnout_risk_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_burnout_scores_status ON public.burnout_risk_scores(risk_status);
ALTER TABLE public.burnout_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "burnout_scores: auth read"   ON public.burnout_risk_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "burnout_scores: auth write"  ON public.burnout_risk_scores FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "burnout_scores: anon read"   ON public.burnout_risk_scores FOR SELECT TO anon          USING (true);
CREATE POLICY "burnout_scores: anon insert" ON public.burnout_risk_scores FOR INSERT TO anon          WITH CHECK (true);
