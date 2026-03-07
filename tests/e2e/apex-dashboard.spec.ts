import { test, expect } from '@playwright/test';

// ============================================================================
// QA PROTOCOL: Wave 76 — The Apex Dashboard (God's Eye View)
// ============================================================================
// 1. Page loads without WSOD.
// 2. Apex component and main God's Eye health scores are displayed.
// 3. Supabase seed message ('Stabil, Ancak Jeopolitik Risk Yüksek') is visible.
// ============================================================================

test.describe('👁️ THE APEX DASHBOARD E2E TEST', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Gods Eye View page loads without WSOD', async ({ page }) => {
    await page.goto('/apex');
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText('Kurumsal GRC Sağlık Skoru')).toBeVisible({ timeout: 10000 });
  });

  test('Consolidated scores and C-level executive message load from Supabase', async ({ page }) => {
    await page.goto('/apex');
    await page.waitForTimeout(3500);

    // Look for the loaded top-level score and message
    await expect(page.getByText('842')).first().toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Stabil, Ancak Jeopolitik Risk Yüksek')).toBeVisible();
    
    // Look for Trend chart component
    await expect(page.getByText('Sağlık Skoru Trendi')).toBeVisible();
  });
});
