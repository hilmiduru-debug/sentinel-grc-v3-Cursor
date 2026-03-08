import { test, expect } from '@playwright/test';
test('get crash 500', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await page.evaluate(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('sentinel_token', `seed-bypass-cae`);
    localStorage.setItem('sentinel_user', JSON.stringify({
      id: '00000000-0000-0000-0000-000000000001',
      role: 'cae',
      tenant_id: '11111111-1111-1111-1111-111111111111'
    }));
    localStorage.setItem('tenant_id', '11111111-1111-1111-1111-111111111111');
  });
  
  await page.route('**/rest/v1/incidents*', (route) => {
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Simulated error' }) });
  });

  await page.goto('http://localhost:5173/governance/voice');
  await page.waitForTimeout(5000);
  
  const code = page.locator('code');
  if (await code.isVisible()) {
    console.log("CRASH MESSAGE IS: ", await code.innerText());
  } else {
    console.log("NO CRASH FOUND");
  }
});
