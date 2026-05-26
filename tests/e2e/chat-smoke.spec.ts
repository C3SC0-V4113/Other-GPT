import { expect, test } from '@playwright/test';

test('renders the chat shell and composer controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Inicia una conversacion')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /send a message/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Iniciar dictado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cambiar apariencia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Borrar sesion actual' })).toBeVisible();
});
