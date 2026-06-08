import { expect, test } from '@playwright/test';

test('les sélecteurs de capture mission ouvrent le drawer', async ({ page }) => {
  await page.goto('/missions');

  const firstMission = page.locator('[data-testid="mission-row"]').first();
  await expect(firstMission).toBeVisible();

  await firstMission.click();
  await expect(page.locator('[data-testid="mission-drawer"]')).toBeVisible();
});
