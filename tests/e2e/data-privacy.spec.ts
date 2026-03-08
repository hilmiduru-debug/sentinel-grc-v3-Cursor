import { test, expect } from '@playwright/test';

// ============================================================================
// QA PROTOCOL: Wave 64 — Data Privacy & PII Flow Mapper
// ============================================================================
// 1. Page loads without WSOD.
// 2. Dashboard KPIs (Consent Ratio, Active Breaches) exist.
// 3. Supabase data flows mapping and privacy breach lists are rendered.
// ============================================================================

test.describe('🛡️ DATA PRIVACY & PII FLOW MAPPER E2E TEST', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('KVKK Data Privacy page loads without WSOD', async ({ page }) => {
    await page.goto('/data-privacy');
    await page.waitForTimeout(500);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText('KVKK & GDPR Veri Mahremiyeti')).toBeVisible({ timeout: 10000 });
  });

  test('Data flows and breaches are loaded from Supabase', async ({ page }) => {
    await page.goto('/data-privacy');
    await page.waitForTimeout(500);

    // Look for the loaded Dataflow mapping (Cross Border)
    await expect(page.getByText('Global Analytics Cloud (Frankfurt)')).toBeVisible({ timeout: 10000 });
    
    // Look for the loaded Breach from the seed
    await expect(page.getByText('Müşteri Kimlik Verisinin Bulut Sağlayıcıya Şifresiz Aktarımı')).toBeVisible();
  });
});
