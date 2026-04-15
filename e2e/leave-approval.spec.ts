import { expect, test } from '@playwright/test';
import { loginAs, signOut } from './helpers';

test('submits leave as an employee and approves it through manager and HR portals', async ({ page }) => {
  await loginAs(page, 'employee.portal@metalabstech.com', 'Meta@12345');
  await page.getByRole('link', { name: /^leave$/i }).click();
  await expect(page).toHaveURL(/\/portal\/employee\/leave/);
  await page.getByPlaceholder('Reason for leave').fill(`QA leave submission ${Date.now()}`);
  await page.getByTestId('leave-submit').click();
  await expect(page.getByText('Leave request submitted successfully.')).toBeVisible();

  await signOut(page);

  await loginAs(page, 'manager.portal@metalabstech.com', 'Meta@12345');
  await page.getByRole('link', { name: /^leave$/i }).click();
  await expect(page.getByRole('button', { name: /^approve$/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /^approve$/i }).first().click();

  await signOut(page);

  await loginAs(page, 'hr.portal@metalabstech.com', 'Meta@12345');
  await page.getByRole('link', { name: /^leave$/i }).click();
  await expect(page.getByRole('button', { name: /^approve$/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /^approve$/i }).first().click();

  await expect(page.getByRole('heading', { name: /leave requests/i })).toBeVisible();
});
