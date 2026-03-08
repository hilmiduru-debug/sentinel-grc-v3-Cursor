import { test, expect } from '@playwright/test';

// ============================================================================
// QA PROTOCOL: Wave 48 — BCP & Crisis Management Cockpit
// ============================================================================
// 1. Page loads without WSOD.
// 2. CrisisCockpit tab renders active crisis cards with title and severity badges.
// 3. RTO countdown timer component is visible (not blank).
// 4. BCP Scenarios tab renders scenario cards.
// 5. History tab renders without crash.
// ============================================================================

test.describe('🚨 BCP CRISIS COCKPIT E2E TEST', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('BCP page loads without WSOD', async ({ page }) => {
    await page.goto('/bcp');
    await page.waitForTimeout(500);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText('BCP & Kriz Yönetimi')).toBeVisible({ timeout: 10000 });
  });

  test('CrisisCockpit shows active crisis cards from Supabase', async ({ page }) => {
    await page.goto('/bcp');
    await page.waitForTimeout(500);

    // Default tab is Kriz Kokpiti
    await expect(page.getByText('Veri Merkezi A Kesintisi')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('CRITICAL')).toBeVisible();
    // RTO countdown or breach label should appear
    const rtoEl = page.locator('[class*="tabular-nums"]').first();
    await expect(rtoEl).toBeVisible();
  });

  test('BCP Scenarios tab renders scenario cards', async ({ page }) => {
    await page.goto('/bcp');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /BCP Senaryoları/ }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText('BCP-IT-001')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('240')).toBeVisible();
  });

  test('History tab renders without crash', async ({ page }) => {
    await page.goto('/bcp');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Tarihçe/ }).click();
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
