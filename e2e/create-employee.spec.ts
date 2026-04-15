import { expect, test } from '@playwright/test';
import { loginAs, signOut } from './helpers';

test('creates an employee account and uses the issued credentials to sign in', async ({ page }) => {
  const uniqueEmail = `qa.employee.${Date.now()}@metalabstech.com`;

  await loginAs(page, 'zia.aslam@metalabstech.com', 'Meta@12345');
  await page.getByRole('link', { name: /^employees$/i }).click();
  await expect(page).toHaveURL(/\/portal\/super-admin\/employees/);

  await page.getByPlaceholder('First name').fill('Qa');
  await page.getByPlaceholder('Last name').fill('Employee');
  await page.getByPlaceholder('Work email').fill(uniqueEmail);
  await page.locator('select').nth(1).selectOption({ index: 1 });
  await page.getByPlaceholder('Designation').fill('QA Engineer');
  await page.getByPlaceholder('Basic salary').fill('150000');
  await page.getByTestId('employee-create-submit').click();

  await expect(page.getByText('Employee account created successfully.')).toBeVisible();
  await expect(page.getByTestId('issued-credentials-email')).toHaveText(uniqueEmail);

  const temporaryPassword = (await page.getByTestId('issued-credentials-password').textContent())?.trim();
  expect(temporaryPassword).toBeTruthy();

  await signOut(page);
  await loginAs(page, uniqueEmail, temporaryPassword!);

  await expect(page.getByText('Employee Self-Service').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
