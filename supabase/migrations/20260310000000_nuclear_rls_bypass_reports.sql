/*
  # Raporlar ve Denetimler için Demo Mode RLS Bypass

  Demo ortamında rapor listesinin boş dönmesini engellemek için
  reports, audit_engagements ve audit_findings tablolarında
  tüm kullanıcılar (anon + authenticated) için tam SELECT yetkisi verir.

  UYARI: Production'da tenant bazlı RLS ile değiştirilmelidir.
*/

-- reports: Herkes okuyabilsin
DROP POLICY IF EXISTS "Enable read access for all users" ON public.reports;
CREATE POLICY "Enable read access for all users"
  ON public.reports FOR SELECT
  TO anon, authenticated
  USING (true);

-- audit_engagements: Herkes okuyabilsin (JOIN için gerekli)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.audit_engagements;
CREATE POLICY "Enable read access for all users"
  ON public.audit_engagements FOR SELECT
  TO anon, authenticated
  USING (true);

-- audit_findings: Herkes okuyabilsin (bulgu sayısı için gerekli)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.audit_findings;
CREATE POLICY "Enable read access for all users"
  ON public.audit_findings FOR SELECT
  TO anon, authenticated
  USING (true);
