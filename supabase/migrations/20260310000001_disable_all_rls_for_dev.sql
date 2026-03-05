/*
  # Geliştirme Ortamı (Dev Mode) — Evrensel RLS Bypass

  Dev aşamasında seed/sahte verilerle test ederken RLS engelini kaldırır.
  Ana tablolarda ROW LEVEL SECURITY tamamen kapatılır; tüm okuma/yazma serbesttir.

  UYARI: Sadece geliştirme ortamı için. Production'da KESİNLİKLE kullanılmamalı.
*/

-- Raporlama ve ilgili tablolar
ALTER TABLE IF EXISTS public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_versions DISABLE ROW LEVEL SECURITY;

-- Denetim ve bulgu tabloları
ALTER TABLE IF EXISTS public.audit_engagements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_findings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_entities DISABLE ROW LEVEL SECURITY;

-- m6 raporlama (legacy)
ALTER TABLE IF EXISTS public.m6_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.m6_report_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.m6_report_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.m6_report_blocks DISABLE ROW LEVEL SECURITY;

-- Tenant ve kullanıcı (seed ile uyum)
ALTER TABLE IF EXISTS public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_tenants DISABLE ROW LEVEL SECURITY;
