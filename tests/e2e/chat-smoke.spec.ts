import { expect, test } from '@playwright/test';

// Pin the browser locale so locale detection is deterministic (the app reads
// Accept-Language when no NEXT_LOCALE cookie is present).
test.use({ locale: 'es-ES' });

test('renders the chat shell and composer controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Inicia una conversación')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /escribe un mensaje/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Iniciar dictado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cambiar idioma' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cambiar apariencia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Borrar sesión actual' })).toBeVisible();
});

test('switches the interface language with the header selector', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Inicia una conversación')).toBeVisible();

  await page.getByRole('button', { name: 'Cambiar idioma' }).click();
  await page.getByRole('menuitem', { name: 'English' }).click();

  await expect(page.getByText('Start a conversation')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear current session' })).toBeVisible();
});
