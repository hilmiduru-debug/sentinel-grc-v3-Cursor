/**
 * SENTINEL GRC v3.0 — Task Command E2E Test Suite
 * ================================================
 * Wave 11 | GIAS QA Anayasası
 *
 * QA İlkeleri:
 *   1. Gerçek Veri: seed.sql ile beslenen Supabase veritabanı — mock yok.
 *   2. WSOD Kontrolü: undefined/null veri çökmesini kanıtla.
 *   3. 4 Ana Senaryo: MagicInput · SuperDrawer · LinkedBadge · Toggle
 *
 * Rota: /tasks  (TaskCommandWidget barındırılmalı)
 *
 * Seed'den beklenen hazır veriler:
 *   - "Kredi riski çalışma kağıdını tamamla"  → workpaper linked (WP-2026-KRD-01)
 *   - "BDDK raporunu Genel Müdür'e ilet"       → is_my_day + is_important
 *   - "VPN erişim iznini yenile"               → status=completed (üzeri çizili)
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:5173';
const ROUTE = `${BASE}/tasks`;

/** seed.sql'deki CAE kullanıcısı */
const SEED_USER = {
  id:    '00000000-0000-0000-0000-000000000001',
  email: 'cae@sentinelbank.com.tr',
  role:  'cae',
  name:  'Dr. Hasan Aksoy',
};

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

// ─── Yardımcı: Auth localStorage enjeksiyonu ──────────────────────────────────

async function injectAuth(page: Page): Promise<void> {
  const session = {
    access_token:  'seed-test-token',
    refresh_token: 'seed-refresh-token',
    expires_at:    Math.floor(Date.now() / 1000) + 86_400,
    token_type:    'bearer',
    user: {
      id:    SEED_USER.id,
      email: SEED_USER.email,
      role:  'authenticated',
      app_metadata:  { provider: 'email' },
      user_metadata: { full_name: SEED_USER.name, role: SEED_USER.role },
    },
  };

  await page.evaluate((s) => {
    const key = `sb-${location.hostname.split('.')[0]}-auth-token`;
    localStorage.setItem(key, JSON.stringify(s));
    localStorage.setItem('sentinel-tenant-id', '11111111-1111-1111-1111-111111111111');
    localStorage.setItem('sentinel-user-id', s.user.id);
  }, session);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe('Task Command — Sentinel GRC v3.0 (Wave 11)', () => {

  test.beforeEach(async ({ page }) => {
    // Auth enjeksiyonundan önce sayfayı yükle (localStorage erişimi için)
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await injectAuth(page);
    await page.goto(ROUTE, { waitUntil: 'networkidle' });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: "White Screen of Death" Yokluğu (WSOD Kontrolü)
  // ───────────────────────────────────────────────────────────────────────────

  test('TC-01: /tasks rotası WSOD vermeden yükleniyor', async ({ page }) => {
    // Sayfa başlığı "Error" içermemeli
    await expect(page).not.toHaveTitle(/Error/i);

    // Console'da uncaught exception yok
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Sidebar en az bir akıllı liste göstermeli
    const sidebarItem = page.locator('aside').first().locator('button').first();
    await expect(sidebarItem).toBeVisible({ timeout: 10_000 });

    // Görev listesi konteyneri (orta panel) render edilmiş olmalı
    const taskPanel = page.locator('main').first();
    await expect(taskPanel).toBeVisible();

    // Kritik: WSOD kırmızı bayrak — "Something went wrong" metni yok
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
    await expect(page.getByText(/TypeError/i)).not.toBeVisible();

    // Hata yoksa geç
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Magic Input — Yeni Görev Ekleme (Optimistic Update)
  // ───────────────────────────────────────────────────────────────────────────

  test('TC-02: Magic Input — Enter ile görev eklenince liste anında güncelleniyor', async ({ page }) => {
    const uniqueTitle = `PW-Test Görevi ${Date.now()}`;

    // Magic Input'u bul — placeholder "Görev ekle..."
    const input = page.getByPlaceholder('Görev ekle...');
    await expect(input).toBeVisible({ timeout: 8_000 });

    // Görevi yaz
    await input.fill(uniqueTitle);
    await expect(input).toHaveValue(uniqueTitle);

    // URL'in değişmediğini izle (sayfa yenilenmiyor)
    const urlBefore = page.url();

    // Enter'a bas
    await input.press('Enter');

    // Optimistic update: görev listede anında görünmeli (< 1s)
    const newTaskRow = page.getByText(uniqueTitle, { exact: false });
    await expect(newTaskRow).toBeVisible({ timeout: 3_000 });

    // Input temizlenmiş olmalı (tekrar yazmaya hazır)
    await expect(input).toHaveValue('');

    // URL değişmedi — sayfa yenilenmedi
    expect(page.url()).toBe(urlBefore);

    // Eklenen görevin "tamamlanmamış" durumda (line-through yok) gelmesi bekleniyor
    const taskText = page.getByText(uniqueTitle, { exact: false }).first();
    await expect(taskText).not.toHaveCSS('text-decoration-line', 'line-through');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Super Drawer — Görev Detay Paneli (Sayfa Yenilemesiz)
  // ───────────────────────────────────────────────────────────────────────────

  test('TC-03: Super Drawer — Göreve tıklanınca detay paneli açılıyor ve sayfa yenilenmiyor', async ({ page }) => {
    // seed.sql'den beklenen görev: "BDDK raporunu Genel Müdür'e ilet"
    const SEED_TASK_TITLE = 'BDDK raporunu';

    // Seed görevinin listede görünmesini bekle
    const taskRow = page.getByText(SEED_TASK_TITLE, { exact: false }).first();
    await expect(taskRow).toBeVisible({ timeout: 10_000 });

    // Sayfa yenilemesini izle — navigasyon olmamalı
    let navigationFired = false;
    page.on('framenavigated', () => { navigationFired = true; });

    // Göreve tıkla
    const urlBefore = page.url();
    await taskRow.click();

    // Detay paneli sağdan açılmalı (framer-motion slide)
    // Detay paneli: aside.w-80 veya içinde başlık "BDDK"
    const drawer = page.locator('aside').filter({ hasText: 'BDDK' }).first();
    await expect(drawer).toBeVisible({ timeout: 3_000 });

    // Kapatma (X) butonu panelde mevcut olmalı
    const closeBtn = drawer.locator('button[aria-label=""]').or(
      drawer.locator('button').filter({ hasText: '' })  // X icon
    ).first();

    // Drawer içinde temel bölümler render edilmiş olmalı
    await expect(drawer.getByText(/Bitiş Tarihi/i)).toBeVisible();
    await expect(drawer.getByText(/Not/i)).toBeVisible();

    // Sayfa yenilenmedi
    expect(page.url()).toBe(urlBefore);
    expect(navigationFired).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: Linked Entity Badge — Denetim Bağlamı Rozeti
  // ───────────────────────────────────────────────────────────────────────────

  test('TC-04: Bağlamsal görevde linked entity rozeti render ediliyor', async ({ page }) => {
    // seed.sql'den beklenen: "Kredi riski çalışma kağıdını tamamla" → linked workpaper
    // Önce "Denetim" listesine git (listId: aaaaaaaa-0000-0000-0000-000000000005)
    const DENETIM_LIST = 'Denetim';
    const denetimBtn = page
      .locator('aside')
      .first()
      .getByText(DENETIM_LIST, { exact: true })
      .first();

    await expect(denetimBtn).toBeVisible({ timeout: 8_000 });
    await denetimBtn.click();

    // Linked görevi bul
    const linkedTask = page.getByText('Kredi riski çalışma kağıdını', { exact: false }).first();
    await expect(linkedTask).toBeVisible({ timeout: 6_000 });

    // linked entity rozeti: WP-2026-KRD-01 içeren küçük badge
    // Widget'ta: <span className="text-[10px] text-indigo-500 ..."><Link2/>label</span>
    const badge = page.getByText('WP-2026-KRD-01', { exact: false }).first();
    await expect(badge).toBeVisible({ timeout: 5_000 });

    // Badge'in doğru renk sınıfına sahip olması (indigo)
    await expect(badge).toHaveCSS('color', /rgb\(99,? 102,? 241\)/);

    // Göreve tıkla → Drawer'da linked entity kartı da görünmeli
    await linkedTask.click();
    const drawer = page.locator('aside').filter({ hasText: 'Bağlantılı' }).first();
    await expect(drawer).toBeVisible({ timeout: 3_000 });
    await expect(drawer.getByText(/WP-2026-KRD-01/i)).toBeVisible();
    await expect(drawer.getByText(/workpaper/i)).toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: Tamamlama Toggle — Checkbox → Üzeri Çizili
  // ───────────────────────────────────────────────────────────────────────────

  test('TC-05: Görev tamamlandı toggle — başlık üzeri çizili hale geliyor', async ({ page }) => {
    // Magic Input ile kontrol edilebilir bir test görevi ekle
    const testTitle = `Toggle-Test-${Date.now()}`;
    const input = page.getByPlaceholder('Görev ekle...');
    await expect(input).toBeVisible({ timeout: 8_000 });
    await input.fill(testTitle);
    await input.press('Enter');

    // Görev listede görünmeli
    const taskRow = page.getByText(testTitle, { exact: false }).first();
    await expect(taskRow).toBeVisible({ timeout: 4_000 });

    // Görev satırının kapsayıcı div'ini bul
    const taskContainer = page.locator('div').filter({ hasText: testTitle }).last();

    // Circle checkbox butonu (tamamla toggle) — satırın ilk butonu
    const checkBtn = taskContainer.locator('button').first();
    await expect(checkBtn).toBeVisible();

    // Başlık metnini tutan <p> elementi
    const titleEl = taskContainer.locator('p').first();
    const beforeDecoration = await titleEl.evaluate(
      (el) => getComputedStyle(el).textDecorationLine
    );
    expect(beforeDecoration).not.toBe('line-through');

    // Tıkla → optimistic update
    await checkBtn.click();

    // Başlık üzeri çizili olmalı (CSS: text-decoration-line: line-through)
    await expect(async () => {
      const decoration = await titleEl.evaluate(
        (el) => getComputedStyle(el).textDecorationLine
      );
      expect(decoration).toBe('line-through');
    }).toPass({ timeout: 3_000 });

    // Tekrar tıkla → pending'e dön (üzeri çizgi kalkmalı)
    await checkBtn.click();
    await expect(async () => {
      const decoration = await titleEl.evaluate(
        (el) => getComputedStyle(el).textDecorationLine
      );
      expect(decoration).not.toBe('line-through');
    }).toPass({ timeout: 3_000 });
  });

});

// ─── Bağımsız Regresyon: Sidebar Akıllı Listeler ──────────────────────────────

test.describe('Task Command — Sidebar Akıllı Liste Navigasyonu', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await injectAuth(page);
    await page.goto(ROUTE, { waitUntil: 'networkidle' });
  });

  test('TC-06: seed smart listeler (Günüm, Önemli, Planlı, Tüm) sidebar\'da görünüyor', async ({ page }) => {
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 8_000 });

    // Her akıllı liste adı sidebar'da mevcut olmalı
    for (const listName of ['Günüm', 'Önemli', 'Planlı', 'Tüm Görevler']) {
      await expect(sidebar.getByText(listName, { exact: true })).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test('TC-07: "Önemli" listesine tıklanınca is_important=true görevler listeleniyor', async ({ page }) => {
    // seed'den beklenen: "BDDK raporunu Genel Müdür'e ilet" → is_important=true, is_my_day=true
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 8_000 });

    const importantBtn = sidebar.getByText('Önemli', { exact: true });
    await expect(importantBtn).toBeVisible();
    await importantBtn.click();

    // Panel başlığı "Önemli" olmalı
    await expect(page.locator('main').getByText('Önemli', { exact: false })).toBeVisible({
      timeout: 5_000,
    });

    // seed'den en az 1 önemli görev görünmeli
    const taskRows = page.locator('main div[class*="rounded-xl"]');
    await expect(taskRows.first()).toBeVisible({ timeout: 5_000 });

    // Star icon — önemli görevlerde dolu yıldız render edilmiş olmalı
    await expect(page.locator('svg[class*="fill-amber"]').first()).toBeVisible({
      timeout: 4_000,
    });
  });

});
