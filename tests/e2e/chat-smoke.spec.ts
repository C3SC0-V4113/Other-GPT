import { expect, test } from '@playwright/test';

const appUrl = `http://127.0.0.1:${process.env.E2E_PORT ?? '3000'}`;

// Pin the browser locale so locale detection is deterministic (the app reads
// Accept-Language when no NEXT_LOCALE cookie is present).
test.use({ locale: 'es-ES' });

// The chat is gated behind a session. Seed the relayed session cookie so the
// optimistic proxy and the authoritative server check (against the mock
// identity-service) both pass and the chat shell renders.
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'identity_service_session', value: 'e2e-session', url: appUrl },
  ]);
});

test('renders the chat shell and composer controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Inicia una conversación')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /escribe un mensaje/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Iniciar dictado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Borrar sesión actual' })).toBeVisible();
  // Language/theme selectors now live inside the user menu (header icon button).
  await expect(page.getByRole('button', { name: /Sesión de/ })).toBeVisible();
});

test('switches the interface language from the user menu', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Inicia una conversación')).toBeVisible();

  await page.getByRole('button', { name: /Sesión de/ }).click();
  await page.getByRole('menuitem', { name: 'English' }).click();

  await expect(page.getByText('Start a conversation')).toBeVisible();
});
