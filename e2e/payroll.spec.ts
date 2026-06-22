import { expect, test } from '@playwright/test';
import { loginAs, signOut } from './helpers';

test('runs payroll, approves the run, and downloads a payslip', async ({ page }) => {
  const runYear = 2030;

  await loginAs(page, 'hr.portal@metalabstech.com', 'Meta@12345');
  await page.getByRole('link', { name: /^payroll$/i }).click();
  await expect(page).toHaveURL(/\/portal\/hr\/payroll/);

  await page.getByPlaceholder('Month').fill('December');
  await page.getByPlaceholder('Year').fill(String(runYear));
  await page.getByTestId('payroll-run-submit').click();

  await expect(page.getByText('Payroll run created. Approve it once the records finish processing.')).toBeVisible();
  await expect(page.getByRole('button', { name: /approve run/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /approve run/i }).first().click();

  await signOut(page);

  await loginAs(page, 'employee.portal@metalabstech.com', 'Meta@12345');
  await page.getByRole('link', { name: /^payroll$/i }).click();
  await expect(page).toHaveURL(/\/portal\/employee\/payroll/);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /download payslip/i }).first().click();
  const download = await downloadPromise;

  expect(await download.suggestedFilename()).toMatch(/payslip-.*\.pdf/);
});
