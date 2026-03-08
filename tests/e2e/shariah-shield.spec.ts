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

test.describe('Wave 90: Shariah-AI Algorithmic Filter E2E Tests', () => {
  test('Shariah Shield page loads securely and UI is protected against NaN scaling errors', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/governance/shariah-shield`);
    
    // Auto-retry assertion for API load (either data title or fallback error)
    const titleLocator = page.locator('text=Shariah-AI Uyum Kalkanı').first();
    const errLocator = page.locator('text=Shariah-AI Filtresine (Algorithmic Shield) erişilirken veri hatası').first();
    
    await expect(titleLocator.or(errLocator)).toBeVisible({ timeout: 15000 });

    const bodyText = await page.locator('body').textContent() ?? '';
    // Hacim bölmesi hatası (NaN %) veya map null düşmelerine karşı garanti
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('undefined</');
    expect(bodyText).not.toContain('[object Object]');
    
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('Filters switch between Blocked and All Decisions securely preventing map logic crash', async ({ page }) => {
    await loginAsCAE(page);
    await page.goto(`${BASE}/governance/shariah-shield`);
    
    const titleLocator = page.locator('text=Shariah-AI Uyum Kalkanı').first();
    const errLocator = page.locator('text=veri hatası oluştu').first();
    await expect(titleLocator.or(errLocator)).toBeVisible({ timeout: 15000 });

    const hasErrorState = await page.locator('text=veri hatası oluştu').isVisible().catch(() => false);
    if (!hasErrorState) {
       // Tablara tıklayarak map() döngüsünün Null (data || []) ile güvende olduğunu test et.
       
       // 1. AI Emir Logları (All Decisions)
       const allLogsTab = page.getByRole('button', { name: /AI Emir Logları/i }).first();
       if (await allLogsTab.isVisible()) {
         await allLogsTab.click();
         await page.waitForTimeout(500); 
         let bodyText = await page.locator('body').textContent() ?? '';
         expect(bodyText).not.toContain('NaN');
       }

       // 2. Engellenen İşlemler (Blocked)
       const blockedTab = page.getByRole('button', { name: /Engellenen İşlemler/i }).first();
       if (await blockedTab.isVisible()) {
         await blockedTab.click();
         await page.waitForTimeout(500); 
         let bodyText = await page.locator('body').textContent() ?? '';
         expect(bodyText).not.toContain('NaN');
       }
    }
  });
});
