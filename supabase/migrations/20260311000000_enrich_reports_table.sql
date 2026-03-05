/*
  # reports tablosu zenginleştirme — Rapor Türü ve Rapor Notu

  Raporlama modülünde rapor türü (report_type) ve rapor notu (report_grade)
  alanları eklenir. C-Level kartlarda ve filtrelerde kullanılır.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'report_type'
  ) THEN
    ALTER TABLE public.reports
      ADD COLUMN report_type text NOT NULL DEFAULT 'İç Denetim Raporu';
    COMMENT ON COLUMN public.reports.report_type IS 'Rapor türü: İç Denetim, Bilgi Sistemleri, Süreç Denetimi, İnceleme/Soruşturma vb.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'report_grade'
  ) THEN
    ALTER TABLE public.reports
      ADD COLUMN report_grade text;
    COMMENT ON COLUMN public.reports.report_grade IS 'Rapor notu: A (Güçlü), B (Yeterli), C (Gelişim Alanı) vb.';
  END IF;
END $$;
