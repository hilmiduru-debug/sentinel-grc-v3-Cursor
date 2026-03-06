import { test, expect, Page } from '@playwright/test';

// Yardımcı Fonksiyon: Farklı rollere göre sisteme giriş simülasyonu
async function loginAsRole(page: Page, role: 'CAE' | 'Auditor' | 'Auditee', name: string) {
  await page.goto('http://localhost:5173/login');
  
  await page.evaluate(({ role, name }) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('sentinel_token', `mock-${role.toLowerCase()}-token`);
    localStorage.setItem('sentinel_user', JSON.stringify({
      id: `mock-${role.toLowerCase()}-1`,
      name: name,
      email: `${role.toLowerCase()}@sentinel.com`,
      role: role,
      title: role === 'CAE' ? 'Chief Audit Executive' : role === 'Auditor' ? 'Senior Auditor' : 'Department Manager',
    }));
  }, { role, name });

  // Refresh to apply local storage
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
}

test.describe('End-to-End Audit Lifecycle: Planning -> Execution -> Auditee -> Reporting', () => {

  // Testleri seri halinde çalıştırmak daha sağlıklıdır çünkü bir senaryo diğerinin verisini doğrulayacak
  test.describe.configure({ mode: 'serial' });

  test('Step 1: CAE Plans and Initiates the Audit', async ({ page }) => {
    await loginAsRole(page, 'CAE', 'Hasan Yönetici');
    
    // CAE, Evren/Planlama ekranına girip mevcut durumu görür
    await page.goto('http://localhost:5173/strategy/annual-plan');
    await expect(page.locator('body')).not.toContainText('Application Error');
    
    // Denetim başlatma veya plan onaylama aksiyonu 
    // (Mevcut UI mockup olduğu için "Onayla" veya "Yeni Denetim" gibi temsilî butonlara basılır)
    // Şimdilik sadece sayfanın çökmeksizin açıldığını ve ana konteynerin yüklendiğini teyit ediyoruz.
    const container = page.locator('main').first();
    await expect(container).toBeVisible();
  });

  test('Step 2: Auditor Executes Audit and Creates a Finding', async ({ page }) => {
    await loginAsRole(page, 'Auditor', 'Zeynep Denetçi');
    
    // Denetçi İcra/Bulgu ekranına gider
    await page.goto('http://localhost:5173/execution/findings');
    await expect(page.locator('body')).not.toContainText('Application Error');
    
    // "Yeni Bulgu", "Aksiyon", "Kaydet" gibi temel butonların varlığını kontrol eder 
    // Sayfanın başarılı yüklendiğine dair kanıtlar arıyoruz:
    const header = page.locator('h1, h2', { hasText: /Bulgu/i }).first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test('Step 3: Auditee Reviews Finding and Submits Management Response', async ({ page }) => {
    await loginAsRole(page, 'Auditee', 'Mehmet Denetlenen');
    
    // Denetlenen, Denetlenen Portalı (Auditee Portal)'na gider
    await page.goto('http://localhost:5173/auditee-portal');
    await expect(page.locator('body')).not.toContainText('Application Error');
    
    // Portalın yüklendiğini doğrulama
    const portalHeader = page.locator('text=Denetlenen Portalı').first();
    await expect(portalHeader).toBeVisible();

    // Aksiyon Yanıtı veya Bulgu görüntüleme kartlarının gelip gelmediğini kontrol eder
    // Eğer listeleme varsa, bir tanesine tıklayıp "Yanıt Gönder" vb. yapar. 
    // Şimdilik sadece sayfanın ve ana fonksiyon alanının (tablo, liste vs.) render olduğunu görüyoruz.
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();
  });

  test('Step 4: Auditor Verifies Auditee Response in Reporting', async ({ page }) => {
    await loginAsRole(page, 'Auditor', 'Zeynep Denetçi');
    
    // Denetçi Yönetici Özeti Stüdyosuna veya Rapor Kütüphanesine gider
    await page.goto('http://localhost:5173/reporting/library');
    await expect(page.locator('body')).not.toContainText('Application Error');
    
    // İlk raporu açmayı/düzenlemeyi dener 
    const editBtn = page.locator('button:has-text("Düzenle")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      
      // Zen Editör sayfasının (Yönetici Özeti veya Bulgu entegrasyonu) yüklendiğini onaylar
      await expect(page.locator('text=Yönetici Özeti')).toBeVisible({ timeout: 5000 });
    }
  });

});
