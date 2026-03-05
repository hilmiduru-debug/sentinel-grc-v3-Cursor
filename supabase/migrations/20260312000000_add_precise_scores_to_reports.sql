/*
  # reports tablosu — Hassas Skor, Önceki Not, Risk Seviyesi

  Rapor kartlarında C-Level metrikleri: precise_score (Hassas Skor),
  previous_grade (Önceki Not), risk_level (Risk Seviyesi).
  Demo verileri seed.sql içinde UPDATE ile doldurulacaktır.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'precise_score'
  ) THEN
    ALTER TABLE public.reports
      ADD COLUMN precise_score numeric;
    COMMENT ON COLUMN public.reports.precise_score IS 'Hassas skor (0–100, örn. 82.4)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'previous_grade'
  ) THEN
    ALTER TABLE public.reports
      ADD COLUMN previous_grade text;
    COMMENT ON COLUMN public.reports.previous_grade IS 'Önceki dönem notu (örn. B (Yeterli))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'risk_level'
  ) THEN
    ALTER TABLE public.reports
      ADD COLUMN risk_level text;
    COMMENT ON COLUMN public.reports.risk_level IS 'Risk seviyesi: high, medium, low';
  END IF;
END $$;
