import { expect, type Page } from '@playwright/test';

export const loginAs = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('link', { name: /^dashboard$/i }).first()).toBeVisible({ timeout: 15_000 });
};

export const signOut = async (page: Page) => {
  await page.getByTestId('navbar-avatar-button').click();
  await page.getByTestId('navbar-sign-out').click();
  await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 15_000 });
};
