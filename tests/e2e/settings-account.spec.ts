import { expect, test } from '@playwright/test';

const appUrl = `http://127.0.0.1:${process.env.E2E_PORT ?? '3000'}`;

test.use({ locale: 'en-US' });

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: 'identity_service_session',
      value: 'e2e-session',
      url: appUrl,
    },
  ]);
});

test.describe('settings/account — responsive layout', () => {
  test('desktop: redirects to /settings/account, shows sidebar, account info, CTA, and hides Generate images', async ({
    page,
  }, testInfo) => {
    // eslint-disable-next-line playwright/no-skipped-test -- this assertion targets the desktop project only.
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only behavior.');

    await page.goto('/settings');

    await page.waitForURL('/settings/account');
    await expect(page.getByRole('navigation', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Your account details.')).toBeVisible();
    await expect(page.getByText('e2e@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request role upgrade' })).toBeVisible();

    await page.goto('/');
    await expect(page.getByText('Start a conversation')).toBeVisible();

    await page.getByRole('button', { name: 'Composer options' }).click();
    await expect(page.getByText('Generate images')).toBeHidden();
  });

  test('mobile: /settings shows nav list; tapping Account goes to /settings/account with back link', async ({
    page,
  }, testInfo) => {
    // eslint-disable-next-line playwright/no-skipped-test -- this assertion targets the mobile project only.
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile-only behavior.');

    await page.goto('/settings');

    await expect(page.getByRole('navigation', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Your account details.')).toBeHidden();

    await page.getByRole('link', { name: 'Account' }).click();
    await page.waitForURL('/settings/account');

    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Your account details.')).toBeVisible();
    await expect(page.getByText('e2e@example.com')).toBeVisible();
  });
});
