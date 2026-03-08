import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const STUDIO_URL = `${BASE_URL}/execution/findings/new`;

// Helper: set auth in localStorage and navigate to studio
async function loginAndGo(page: any, url: string) {
  // First visit the base URL to get the same origin
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  // Set auth keys
  await page.evaluate(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('sentinel_token', 'mock-token-123');
    localStorage.setItem('sentinel_user', JSON.stringify({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'hasan.aksoy@sentinelbank.com.tr',
      user_metadata: { full_name: 'Hasan Aksoy' },
    }));
  });
  // Now navigate to the target
  await page.goto(url, { waitUntil: 'networkidle' });
}

test.describe('Finding Studio — Restoration Tests', () => {

  test('1. Sayfa çökmeden açılıyor (JS hatası yok)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await loginAndGo(page, STUDIO_URL);
    await expect(page.locator('text=Stüdyo Yükleniyor')).not.toBeVisible({ timeout: 15000 });

    const critical = errors.filter(e => !e.includes('ResizeObserver'));
    expect(critical).toHaveLength(0);
  });

  test('2. Header görünüyor ve geri butonu var', async ({ page }) => {
    await loginAndGo(page, STUDIO_URL);
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 12000 });
    await expect(header.locator('button').first()).toBeVisible();
  });

  test('3. Mode switcher: 3 mod butonu (edit/zen/negotiation)', async ({ page }) => {
    await loginAndGo(page, STUDIO_URL);
    await expect(page.locator('text=Stüdyo Yükleniyor')).not.toBeVisible({ timeout: 15000 });

    const switcher = page.locator('[data-testid="mode-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    const btns = switcher.locator('button');
    await expect(btns).toHaveCount(3);
    await expect(btns.nth(0)).toContainText(/edit/i);
    await expect(btns.nth(1)).toContainText(/zen/i);
    await expect(btns.nth(2)).toContainText(/negotiation/i);
  });

  test('4. Edit modu: En az 5 sekme butonu görünüyor', async ({ page }) => {
    await loginAndGo(page, STUDIO_URL);
    await expect(page.locator('text=Stüdyo Yükleniyor')).not.toBeVisible({ timeout: 15000 });

    const tabBar = page.locator('[data-testid="editor-tab-bar"]');
    await expect(tabBar).toBeVisible({ timeout: 10000 });
    const count = await tabBar.locator('button').count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('5. ZEN moduna geçince edit sekme barı kayboluyor', async ({ page }) => {
    await loginAndGo(page, STUDIO_URL);
    await expect(page.locator('text=Stüdyo Yükleniyor')).not.toBeVisible({ timeout: 15000 });

    const switcher = page.locator('[data-testid="mode-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });
    await switcher.locator('button').nth(1).click();
    await page.waitForTimeout(600);

    await expect(page.locator('[data-testid="editor-tab-bar"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('6. Sağ rail panelinde en az 3 buton görünüyor', async ({ page }) => {
    await loginAndGo(page, STUDIO_URL);
    await expect(page.locator('text=Stüdyo Yükleniyor')).not.toBeVisible({ timeout: 15000 });

    const rail = page.locator('[data-testid="right-rail"]');
    await expect(rail).toBeVisible({ timeout: 10000 });
    const count = await rail.locator('button').count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

});
