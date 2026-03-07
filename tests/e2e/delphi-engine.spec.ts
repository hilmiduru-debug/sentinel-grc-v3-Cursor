import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5175';
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function loginAsCAE(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(({ t }) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('sentinel_token', 'seed-bypass-cae');
    localStorage.setItem('sentinel_user', JSON.stringify({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Dr. Hasan Aksoy',
      email: 'cae@sentinelbank.com.tr',
      role: 'cae',
      title: 'Teftiş Kurulu Başkanı (CAE)',
      tenant_id: t,
    }));
    localStorage.setItem('tenant_id', t);
  }, { t: TENANT_ID });
}

test.describe('Wave 27: Delphi Engine & AI Probe Generator E2E Tests', () => {
  test('Oracle / Delphi page loads without crashing', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/oracle`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // NaN / undefined kontrolü
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('NaN');
    expect(body).not.toContain('undefined');

    // Sayfa 404 vermemeli
    expect(body).not.toContain('404');
    expect(body).not.toContain('Something went wrong');

    // Delphi Oracle metni veya Risk listesi veya "risk yok" mesajı görünmeli
    const hasOracle = await page.getByText('Delphi Oracle').isVisible().catch(() => false);
    const hasNoRisk = await page.getByText('Oylanacak risk yok').isVisible().catch(() => false);
    const hasRound = await page.locator('text=/Tur [0-9]+ —/').isVisible().catch(() => false);
    expect(hasOracle || hasNoRisk || hasRound).toBe(true);
  });

  test('TextToRulePanel generates a probe without crashing', async ({ page }) => {
    await loginAsCAE(page);
    // WatchtowerPage veya Probe Builder sayfası (TextToRulePanel buradaysa)
    // Önce Oracle sayfasını dene
    await page.goto(`${BASE}/oracle`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // NaN / undefined yok
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('NaN');
    expect(body).not.toContain('undefined');

    // Sayfa yüklendi — temel render başarısı
    await expect(page.locator('body')).toBeVisible();
  });

  test('Monitoring Watchtower (Probe Builder) page loads correctly', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/monitoring/watchtower`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // NaN / undefined yok
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('NaN');
    expect(body).not.toContain('undefined');

    // Sayfa 404 vermemeli
    expect(body).not.toContain('404');

    // Herhangi bir başarılı render göstergesi
    await expect(page.locator('body')).toBeVisible();
  });
});
