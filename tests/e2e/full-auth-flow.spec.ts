import { expect, test } from '@playwright/test';

const password = 'Comid@1234567';

// Drive the complete auth flow in English for stable selectors.
test.use({ locale: 'en-US' });

test('registers, reaches account and chat, signs out, and signs back in', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);

  const email = `codex-${testInfo.workerIndex}-${Date.now()}@example.com`;

  await page.route('**/api/chat', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: 'Hello! How can I help you today?',
    });
  });

  await test.step('register a new user', async () => {
    await page.goto('/login');

    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/login\/register\?email=/);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Start a conversation')).toBeVisible();
  });

  await test.step('view the authenticated account page', async () => {
    await page.goto('/settings/account', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Your account details.')).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  await test.step('send a chat message', async () => {
    await page.goto('/');

    const composer = page.getByRole('textbox', { name: /send a message/i });
    const sendButton = page.getByRole('button', { name: 'Send message' });

    await composer.pressSequentially('hola');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    await expect(page.getByText('hola')).toBeVisible();
    await expect(page.getByText('Hello! How can I help you today?')).toBeVisible();
  });

  await test.step('sign out', async () => {
    await page.getByRole('button', { name: /^Signed in as/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login$/);
  });

  await test.step('sign back in with the registered account', async () => {
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/login\/password\?email=/);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Start a conversation')).toBeVisible();
  });
});
