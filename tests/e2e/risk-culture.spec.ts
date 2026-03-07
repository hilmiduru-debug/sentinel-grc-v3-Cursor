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

test.describe('Wave 61: Risk Culture & Tone at the Top E2E Tests', () => {
  test('Culture Pulse page loads without crashing', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/governance/culture-pulse`);
    await page.waitForLoadState('load', { timeout: 15000 });

    const body = await page.locator('body').innerHTML();
    expect(body).not.toContain('NaN');
    expect(body).not.toMatch(/undefined<\//);
    expect(body).not.toContain('Sayfa Bulunamadı');

    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('CultureHeatmap renders metric blocks safely (no zero division)', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/governance/culture-pulse`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent() ?? '';
    // Skorda NaN veya undefined olmamalı
    expect(bodyText).not.toContain('NaN/ 100');
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).toContain('Kurumsal Nabız Skoru');

    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('Department matrix displays without breakdown', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/governance/culture-pulse`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Kategori kontrolü
    await expect(page.locator('text=Speak-Up Kültürü')).toBeVisible() || 
    await expect(page.locator('text=Hesap Verebilirlik')).toBeVisible();

    const body = await page.locator('body').innerHTML();
    expect(body).not.toContain('NaN');
  });
});
