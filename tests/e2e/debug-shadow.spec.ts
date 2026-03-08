import { test, expect } from '@playwright/test';
test('Debug ShadowBoardPage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.context().addInitScript((user: any) => {
    window.localStorage.setItem('sentinel_user', JSON.stringify(user));
    window.localStorage.setItem('sentinel_token', 'fake-jwt-token-for-e2e');
  }, { id: '00000000-0000-0000-0000-000000000001', name: 'Leyla Şahin', role: 'Auditor', tenant_id: '11111111-1111-1111-1111-111111111111' });
  await page.goto('http://localhost:5173/strategy/shadow-board');
  await page.waitForTimeout(500);
  console.log("ERRORS CAUGHT:\n", errors.join("\n"));
});
