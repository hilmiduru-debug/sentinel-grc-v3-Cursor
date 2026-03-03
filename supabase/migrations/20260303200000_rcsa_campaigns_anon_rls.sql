/*
  RCSA campaigns: anon role için SELECT/INSERT/UPDATE izni.
  Uygulama Supabase Auth ile giriş yapmadan (anon key) kullanıldığında
  kampanya listesi ve yeni kampanya oluşturma çalışsın.
*/

-- Mevcut policy'ler sadece authenticated için; anon için ayrı policy ekliyoruz.
CREATE POLICY "rcsa_campaigns_select_anon"
  ON public.rcsa_campaigns
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "rcsa_campaigns_insert_anon"
  ON public.rcsa_campaigns
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "rcsa_campaigns_update_anon"
  ON public.rcsa_campaigns
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
