import { expect, test } from '@playwright/test';
import { loginAs, signOut } from './helpers';

test('creates an employee account and uses the issued credentials to sign in', async ({ page }) => {
  const uniqueEmail = `qa.employee.${Date.now()}@metalabstech.com`;

  await loginAs(page, 'zia.aslam@metalabstech.com', 'Meta@12345');

  const session = await page.evaluate(() => {
    const raw = localStorage.getItem('nexus-auth');
    return raw ? JSON.parse(raw) : null;
  });

  const accessToken = session?.accessToken as string | undefined;
  expect(accessToken).toBeTruthy();

  const joiningDate = new Date();
  joiningDate.setDate(joiningDate.getDate() + 1);
  joiningDate.setHours(9, 0, 0, 0);

  const response = await page.request.post('http://127.0.0.1:4001/api/v1/employees', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      firstName: 'Qa',
      lastName: 'Employee',
      email: uniqueEmail,
      role: 'employee',
      designation: 'QA Engineer',
      employmentType: 'full-time',
      joiningDate: joiningDate.toISOString(),
      status: 'active',
      salary: {
        basic: 150000,
        houseRent: 0,
        medical: 0,
        transport: 0,
        currency: 'PKR',
        bonus: 0,
      },
      emergencyContacts: [],
      skills: [],
      timezone: 'Asia/Karachi',
      workLocation: 'onsite',
      country: 'Pakistan',
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();

  const payload = await response.json();
  const temporaryPassword = payload?.data?.credentials?.generatedPassword as string | undefined;

  expect(payload?.data?.credentials?.email).toBe(uniqueEmail);
  expect(temporaryPassword).toBeTruthy();

  await signOut(page);
  await loginAs(page, uniqueEmail, temporaryPassword!);

  await expect(page.getByText('Employee Self-Service').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
