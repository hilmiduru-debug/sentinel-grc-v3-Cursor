import { test, expect } from '@playwright/test';

test('Report Library Zen Editor crash test', async ({ page }) => {
  // 1. Geliştirici sunucusu ayağa kalkar ve Auth Bypass yapılır
  await page.goto('http://localhost:5173/login');
  await page.evaluate(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('sentinel_token', 'mock');
  });
  
  // 2. Kullanıcı "Iron Vault Raporları" sayfasına gider.
  await page.goto('http://localhost:5173/reporting/library');

  // 3. Sayfadaki ilk raporun "Düzenle" butonuna tıklar ve Zen Editor ekranı açılır.
  const editButton = page.locator('button:has-text("Düzenle")').first();
  await editButton.waitFor({ state: 'visible', timeout: 15000 });
  await editButton.click();

  // 4. Sayfanın (Zen Editor'ün) beyaz ekrana düşmediği (çökmediği) ve "Yönetici Özeti" başlığının ekranda belirdiği assert edilir.
  // Wait a bit to ensure potential crash occurs or page renders
  await page.waitForTimeout(2000); 
  
  const header = page.locator('text=Yönetici Özeti').first();
  await expect(header).toBeVisible({ timeout: 15000 });
});
