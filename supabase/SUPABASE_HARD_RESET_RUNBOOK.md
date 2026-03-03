# Supabase Migration Hard Reset Runbook

Uzak veritabanı migration tarihçesi bozulduğunda veya "Duplicate Key" / "Not Found" döngüsüne girildiğinde kullanılır. **Repair veya Skip önerilmez;** doğrudan nükleer sıfırlama yapılır.

---

## ADIM 1: Yerel migration temizliği

- `supabase/migrations/` içinde **sadece 14 haneli timestamp** formatındaki dosyalar kalmalı (örn. `20260215120000_isim.sql`).
- Duplicate key veya çakışma yaratan dosyalar (ör. eski `20260215_add_bddk_and_observation.sql` gibi 8 haneli veya .backup) **silinmiş** olmalı.
- Kontrol: `ls supabase/migrations | wc -l` → beklenen migration sayısı (ör. 131).

---

## ADIM 2: Nükleer sıfırlama (tercih edilen)

Proje kökünde:

```bash
npx supabase db reset --linked --yes
```

- `--yes`: Onay prompt'unu atlar (uzak DB silinir ve migrations + seed baştan uygulanır).
- Sonuç: Uzak public şeması yerel `migrations/` + `seed.sql` ile birebir aynı hale gelir.
- Başarı: Exit code 0 ve logda "Seeding data from supabase/seed.sql..." görülür.

---

## ADIM 3: Reset komutu çalışmazsa (manuel imha)

CLI reset'e direnç varsa (link bozuk, yetki hatası vb.):

1. **Projeyi yeniden bağla** (proje ref ve DB şifresi Supabase Dashboard’dan alınır):

   ```bash
   npx supabase link --project-ref <PROJE_REF> --password <DB_ŞİFRESİ>
   ```

2. **Tüm migration’ları zorla push et** (mevcut uzak migration tarihçesini override eder):

   ```bash
   npx supabase db push --force-all
   ```

3. **Seed’i ayrıca basmak gerekebilir:** Dashboard → SQL Editor üzerinden `supabase/seed.sql` içeriğini çalıştırın.

---

## Çıktı beklentisi

- Yeşil / başarılı tamamlanma.
- Uygulama veritabanına sorunsuz bağlanır; duplicate key veya migration "Not Found" hatası kalmaz.
