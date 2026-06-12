import { expect, test } from '@playwright/test';

// Drive the auth flow in English for stable selectors.
test.use({ locale: 'en-US' });

test('redirects to /login when there is no session', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});

test('registers a new user and lands in the chat', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('new@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();

  // A new email routes to the dedicated register page.
  await expect(page).toHaveURL(/\/login\/register\?email=/);
  await page.getByLabel('Password', { exact: true }).fill('longenough');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  await expect(page.getByText('Start a conversation')).toBeVisible();
});

test('logs an existing user in and back out', async ({ page }) => {
  await page.goto('/login');

  // An "existing" email routes (rebote) to the dedicated password page.
  await page.getByLabel('Email').fill('existing@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/login\/password\?email=/);
  await page.getByLabel('Password', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('Start a conversation')).toBeVisible();

  // Sign out via the user menu → back to /login.
  await page.getByRole('button', { name: /^Signed in as/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/login$/);
});
