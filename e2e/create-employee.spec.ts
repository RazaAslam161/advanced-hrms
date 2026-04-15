import { expect, test } from '@playwright/test';
import { loginAs, signOut } from './helpers';

const pad = (value: number) => String(value).padStart(2, '0');

const toLocalDateTimeInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

test('creates an employee account and uses the issued credentials to sign in', async ({ page }) => {
  const uniqueEmail = `qa.employee.${Date.now()}@metalabstech.com`;

  await loginAs(page, 'zia.aslam@metalabstech.com', 'Meta@12345');
  await page.getByRole('link', { name: /^employees$/i }).click();
  await expect(page).toHaveURL(/\/portal\/super-admin\/employees/);

  await page.getByPlaceholder('First name').fill('Qa');
  await page.getByPlaceholder('Last name').fill('Employee');
  await page.getByPlaceholder('Work email').fill(uniqueEmail);

  const selects = page.locator('select');
  await selects.nth(1).selectOption({ index: 1 });

  const joiningDate = new Date();
  joiningDate.setDate(joiningDate.getDate() + 1);
  joiningDate.setHours(9, 0, 0, 0);
  await page.locator('input[type="datetime-local"]').first().fill(toLocalDateTimeInputValue(joiningDate));

  await page.getByPlaceholder('Designation').fill('QA Engineer');
  await page.getByPlaceholder('Basic salary').fill('150000');

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/employees') &&
      response.request().method() === 'POST',
  );

  await page.getByTestId('employee-create-submit').click();

  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), await createResponse.text()).toBeTruthy();

  await expect(page.getByTestId('issued-credentials-card')).toBeVisible();
  await expect(page.getByTestId('issued-credentials-email')).toHaveText(uniqueEmail);

  const temporaryPassword = (await page.getByTestId('issued-credentials-password').textContent())?.trim();
  expect(temporaryPassword).toBeTruthy();

  await signOut(page);
  await loginAs(page, uniqueEmail, temporaryPassword!);

  await expect(page.getByText('Employee Self-Service').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
