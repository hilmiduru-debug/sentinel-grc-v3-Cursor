import { test, expect } from '@playwright/test';

// ============================================================================
// QA PROTOCOL: Wave 76 — The Apex Dashboard (God's Eye View)
// ============================================================================
// 1. Page loads without WSOD.
// 2. Apex component and main God's Eye health scores are displayed.
// 3. Supabase seed message ('Stabil, Ancak Jeopolitik Risk Yüksek') is visible.
// ============================================================================

async function loginAs(page: any, id: string, name: string, role: string) {
  await page.context().addInitScript((user: any) => {
    window.localStorage.setItem('sentinel_user', JSON.stringify(user));
    window.localStorage.setItem('sentinel_token', 'fake-jwt-token-for-e2e');
  }, { id, name, role, tenant_id: '11111111-1111-1111-1111-111111111111' });
}

test.describe('👁️ THE APEX DASHBOARD E2E TEST', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Gods Eye View page loads without WSOD', async ({ page }) => {
    page.on('pageerror', (err) => console.error('PAGE_ERROR:', err.message));
    await loginAs(page, '00000000-0000-0000-0000-000000000001', 'Leyla Şahin', 'Auditor');
    await page.goto('/apex');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText('Kurumsal GRC').first()).toBeVisible({ timeout: 15000 });
  });

  test('Consolidated scores and C-level executive message load from Supabase', async ({ page }) => {
    await loginAs(page, '00000000-0000-0000-0000-000000000001', 'Leyla Şahin', 'Auditor');
    await page.goto('/apex');
    await page.waitForTimeout(1000);

    // Look for the loaded top-level score and message
    await expect(page.getByText('842').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Jeopolitik Risk').first()).toBeVisible({ timeout: 15000 });
    
    // Look for Trend chart component
    await expect(page.getByText('Sağlık Skoru Trendi')).toBeVisible({ timeout: 10000 });
  });
});
