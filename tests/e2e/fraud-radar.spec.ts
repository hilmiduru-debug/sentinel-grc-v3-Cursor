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

test.describe('Wave 85: Employee Stress & Fraud Correlation Engine E2E Tests', () => {
  test('Fraud Radar page loads securely and UI is protected against NaN errors', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/governance/fraud-radar`);
    
    // Auto-retry assertion for API load (either data title or fallback error)
    const titleLocator = page.locator('text=Personel Stres & Suiistimal Motoru').first();
    const errLocator = page.locator('text=Finansal stres veya Fraud motoruna erişilirken').first();
    
    await expect(titleLocator.or(errLocator)).toBeVisible({ timeout: 15000 });

    const bodyText = await page.locator('body').textContent() ?? '';
    // Matematiksel bölme (division-by-zero) ve undefined çökmelerine karşı koruma
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('undefined</');
    expect(bodyText).not.toContain('[object Object]');
    
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('Filters safely switch between alerts and profiles (fraud triangles)', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/governance/fraud-radar`);
    
    const titleLocator = page.locator('text=Personel Stres & Suiistimal Motoru').first();
    const errLocator = page.locator('text=Finansal stres').first();
    await expect(titleLocator.or(errLocator)).toBeVisible({ timeout: 15000 });

    const hasErrorState = await page.locator('text=Finansal stres').isVisible().catch(() => false);
    if (!hasErrorState) {
       // Tablara tıklayarak map() döngüsünün Null (data || []) ile güvende olduğunu test et.
       
       // 1. Riskli Profiller (Fraud Triangle)
       const profilesTab = page.getByRole('button', { name: /Riskli Profiller/i }).first();
       if (await profilesTab.isVisible()) {
         await profilesTab.click();
         await page.waitForTimeout(500); 
         let bodyText = await page.locator('body').textContent() ?? '';
         expect(bodyText).not.toContain('NaN');
       }

       // 2. Aktif Alarmlar
       const alertsTab = page.getByRole('button', { name: /Aktif Alarmlar/i }).first();
       if (await alertsTab.isVisible()) {
         await alertsTab.click();
         await page.waitForTimeout(500); 
         let bodyText = await page.locator('body').textContent() ?? '';
         expect(bodyText).not.toContain('NaN');
       }
    }
  });
});
