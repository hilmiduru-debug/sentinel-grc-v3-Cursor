import { test, expect } from '@playwright/test';

// ============================================================================
// QA PROTOCOL: Wave 24 — ESG Planet Pulse Dashboard
// ============================================================================
// RULES:
// 1. NO White Screen of Death (WSOD) on load.
// 2. The 3 ESG pillars (E, S, G) must render with live metric counts.
// 3. Green Skeptic alarm section must appear for flagged data points.
// 4. Charts must render without JavaScript crashes.
// 5. Cryo-Chamber data table must be populated.
// ============================================================================

test.describe('🌱 SENTINEL V3.0 ESG PLANET PULSE E2E TEST', () => {
  test.use({
    viewport: { width: 1440, height: 900 },
  });

  test('ESG Dashboard should load without WSOD and render live Supabase data', async ({ page }) => {
    // 1. Navigate to ESG page
    await page.goto('/esg');
    await page.waitForTimeout(500);

    // 2. ASSERT WSOD protection — main containers must be visible
    //    If hooks throw, the page would be blank/white
    const header = page.getByText('ESG').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // 3. Check the view toggle buttons render (Planet Pulse / Veri Girişi)
    await expect(page.getByText('Planet Pulse', { exact: false })).toBeVisible();
    await expect(page.getByText('Veri Girisi', { exact: false })).toBeVisible();

    // 4. The "Planet Pulse" view should be the default — confirm it's active
    //    Check for the "ESG & Surdurulebilirlik" header
    await expect(page.getByText('CEVRE')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('SOSYAL')).toBeVisible();
    await expect(page.getByText('YONETISIM')).toBeVisible();

    // 5. Verify the charts are rendered (Karbon Ayak İzi section)
    await expect(page.getByText('Karbon Ayak Izi')).toBeVisible();

    // 6. Verify Yeşil Varlık Oranı section exists
    await expect(page.getByText('Yesil Varlik Orani')).toBeVisible();

    // 7. Check that the Green Skeptic alarm section appears
    //    (We seeded 3 flagged data points: Kapsam 1, GAR, Mevzuat Cezası)
    await expect(page.getByText('Green Skeptic Alarmlari')).toBeVisible({ timeout: 12000 });

    // 8. Verify the Cryo-Chamber data table (all data records)
    await expect(page.getByText('Tum Veri Kayitlari')).toBeVisible();

    // 9. Ensure specific seeded metric codes appear in the table
    await expect(page.getByText('GRI 305-1')).toBeVisible();
    await expect(page.getByText('GRI 305-2')).toBeVisible();

    // 10. Verify Social Metrics section
    await expect(page.getByText('Cesitlilik')).toBeVisible();

    // allow visual inspection
    await page.waitForTimeout(4000);
  });

  test('ESG Data Entry view should render without crashing', async ({ page }) => {
    await page.goto('/esg');
    await page.waitForTimeout(500);

    // Switch to data entry view
    const entryTab = page.getByText('Veri Girisi', { exact: false });
    await expect(entryTab).toBeVisible();
    await entryTab.click();
    await page.waitForTimeout(2000);

    // No WSOD — page must still be mounted
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
    
    await page.waitForTimeout(2000);
  });
});
