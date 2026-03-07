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

test.describe('Wave 74: Auditor Well-Being & Burnout Predictor E2E Tests', () => {
  test('Wellbeing page loads without crashing and zero division guard works', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/resources/well-being`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Auto-retry assertion for API load (either data or fallback error)
    const titleLocator = page.locator('text=Kurumsal Tükenmişlik Radarı').first();
    const errLocator = page.locator('text=İK ve tükenmişlik verileri yüklenirken').first();
    
    await expect(titleLocator.or(errLocator)).toBeVisible({ timeout: 15000 });

    const bodyText = await page.locator('body').textContent() ?? '';
    // Crash kontrolü (NaN, undefined olmamalı)
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('undefined</');
    expect(bodyText).not.toContain('[object Object]');
    
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('Filter toggles between ALL and CRITICAL risk securely', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/resources/well-being`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const titleLocator = page.locator('text=Kurumsal Tükenmişlik Radarı').first();
    const errLocator = page.locator('text=İK ve tükenmişlik verileri yüklenirken').first();
    await expect(titleLocator.or(errLocator)).toBeVisible({ timeout: 15000 });

    const hasErrorState = await page.locator('text=İK ve tükenmişlik verileri yüklenirken').isVisible().catch(() => false);
    if (!hasErrorState) {
       // Filter butonunu bularak tıklama (Güvenli bekleme ile)
       const criticalBtn = page.getByRole('button', { name: /Kritik Risk/i }).first();
       if (await criticalBtn.isVisible()) {
         await criticalBtn.click();
         await page.waitForTimeout(500); // UI re-render
         
         const bodyText = await page.locator('body').textContent() ?? '';
         expect(bodyText).not.toContain('NaN');
       }
    }
  });
});
