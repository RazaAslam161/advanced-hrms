import { expect, test } from '@playwright/test';
import { loginAs, signOut } from './helpers';

const pad = (value: number) => String(value).padStart(2, '0');

const toLocalDateTimeInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const nextWeekdayAt = (hours: number, minutes = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  date.setHours(hours, minutes, 0, 0);
  return toLocalDateTimeInputValue(date);
};

test('submits leave as an employee and approves it through manager and HR portals', async ({ page }) => {
  await loginAs(page, 'employee.portal@metalabstech.com', 'Meta@12345');
  await page.getByRole('link', { name: /^leave$/i }).click();
  await expect(page).toHaveURL(/\/portal\/employee\/leave/);

  const startDate = nextWeekdayAt(9, 0);
  const endDate = nextWeekdayAt(18, 0);

  const dateInputs = page.locator('input[type="datetime-local"]');
  await dateInputs.nth(0).fill(startDate);
  await dateInputs.nth(1).fill(endDate);

  await page.getByPlaceholder('Reason for leave').fill(`QA leave submission ${Date.now()}`);
  await page.getByTestId('leave-submit').click();

  await expect(page.getByText(/Leave request submitted successfully\./i)).toBeVisible();

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
