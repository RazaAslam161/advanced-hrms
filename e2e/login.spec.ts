import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

test('signs in through the seeded login flow', async ({ page }) => {
  await loginAs(page, 'zia.aslam@metalabstech.com', 'Meta@12345');

  await expect(page.getByText('Super Admin Portal').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
