-- ==============================================================================
-- 🚨 Acil Müdahale: RLS Duvarlarını Esnetme (Demo Modu)
-- ==============================================================================
-- Frontend'in Rol Simülasyonu (mock auth) sebebiyle veritabanından veri
-- çekememesi (boş sayfa) sorununu çözmek için tüm public tablolara
-- evrensel bir okuma (SELECT) politikası eklenmektedir.
-- Bu politika, anon ve authenticated dahil herkesin veriyi okumasına izin verir.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        -- Eğer önceden eklenmişse çatışmayı önlemek için sil
        EXECUTE format('DROP POLICY IF EXISTS "Global Demo Read Access" ON public.%I', r.tablename);
        
        -- Evrensel okuma politikasını ekle
        EXECUTE format('CREATE POLICY "Global Demo Read Access" ON public.%I FOR SELECT USING (true)', r.tablename);
    END LOOP;
END
$$;
