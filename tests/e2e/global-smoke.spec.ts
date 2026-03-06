import { test, expect } from '@playwright/test';
import { navigationConfig, getAllNavigationPaths } from '../../src/shared/config/navigation';

// Ignore paths with dynamic params for a simple smoke test, or provide a default fallback
const staticPaths = Array.from(new Set(getAllNavigationPaths().filter(path => !path.includes(':'))));

test.describe('Global Smoke Test - Error Detection', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Geliştirici sunucusu ayağa kalkar ve Auth Bypass yapılır
    await page.goto('http://localhost:5173/login');
    await page.evaluate(() => {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('sentinel_token', 'mock');
      localStorage.setItem('sentinel_user', JSON.stringify({
        id: 'mock-user-1',
        name: 'Hakan Yılmaz',
        email: 'admin@sentinel.com',
        role: 'CAE',
        title: 'Chief Audit Executive',
      }));
    });
  });

  for (const path of staticPaths) {
    test(`Navigate to ${path} without crashing`, async ({ page }) => {
      const url = `http://localhost:5173${path}`;
      
      const response = await page.goto(url);
      
      // 200 OK assert
      expect(response?.status()).toBeLessThan(400);

      // Wait a bit to ensure potential crash occurs or page renders
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); 

      // White Screen of Death or Error Boundary Assert
      // We check if the body has content and doesn't contain common React error boundary texts
      const bodyText = await page.innerText('body');
      
      expect(bodyText).not.toContain('Application Error');
      expect(bodyText).not.toContain('Minified React error');
      expect(bodyText).not.toContain('Cannot read properties of null');
      expect(bodyText).not.toContain('Cannot read properties of undefined');

      // Assert basic layout elements are visible. Usually the sidebar or header.
      // E.g. Sentinel brand or Dashboard link should be visible if layout is intact.
      const sidebarSentinel = page.locator('text=SENTINEL').first();
      await expect(sidebarSentinel).toBeVisible();
    });
  }
});
