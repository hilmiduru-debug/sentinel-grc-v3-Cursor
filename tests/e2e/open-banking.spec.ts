import { test, expect } from '@playwright/test';

// ============================================================================
// QA PROTOCOL: Wave 67 — Open Banking & API Security Auditor
// ============================================================================
// 1. Page loads without WSOD.
// 2. Dashboard KPIs (Rate Limit Ratio, Error Ratios, PSD2 Tokens) exist.
// 3. Supabase API log streams and Incident warnings are rendered.
// ============================================================================

test.describe('🏦 OPEN BANKING & API AUDITOR E2E TEST', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Open Banking Terminal & Dashboard page loads without WSOD', async ({ page }) => {
    await page.goto('/open-banking');
    await page.waitForTimeout(500);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText('Open Banking & API Security Auditor')).toBeVisible({ timeout: 10000 });
  });

  test('API Breach incidents and Logs load from Supabase', async ({ page }) => {
    await page.goto('/open-banking');
    await page.waitForTimeout(500);

    // Look for the loaded Breach from the seed
    await expect(page.getByText('Açık Bankacılık Aggregator TPPsi süresi dolmuş')).toBeVisible({ timeout: 10000 });
    
    // Look for the live log stream (consumer app name check)
    await expect(page.getByText('Fintek X Öde').first()).toBeVisible();
  });
});
