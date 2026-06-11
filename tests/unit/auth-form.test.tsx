import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthForm } from '@/components/auth/auth-form';
import en from '@/messages/en.json';

const { replaceMock, refreshMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderAuthForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AuthForm />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // `mockReset` also clears the queued `mockResolvedValueOnce` values so they
  // don't leak across tests (clearAllMocks keeps the once-queue).
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('AuthForm', () => {
  it('routes an existing email to the login step (rebote) and signs in', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ email: 'a@b.com', exists: true, nextStep: 'LOGIN' }))
      .mockResolvedValueOnce(jsonResponse({ user: { email: 'a@b.com' } }));

    renderAuthForm();

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // Rebound to login (not register).
    const signIn = await screen.findByRole('button', { name: 'Sign in' });
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull();

    await user.type(screen.getByLabelText('Password'), 'supersecret');
    await user.click(signIn);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/');
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('routes a new email to the register step and creates the account', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ email: 'new@b.com', exists: false, nextStep: 'REGISTER' })
      )
      .mockResolvedValueOnce(jsonResponse({ user: { email: 'new@b.com' } }, 201));

    renderAuthForm();

    await user.type(screen.getByLabelText('Email'), 'new@b.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const createAccount = await screen.findByRole('button', { name: 'Create account' });
    await user.type(screen.getByLabelText('Password'), 'longenough');
    await user.click(createAccount);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/');
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/register',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows a localized error on invalid credentials', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ email: 'a@b.com', exists: true, nextStep: 'LOGIN' }))
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'INVALID_CREDENTIALS' } }, 401));

    renderAuthForm();

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Wrong email or password.')).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('blocks a malformed email client-side before any request', async () => {
    const user = userEvent.setup();
    renderAuthForm();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks a too-short password on register client-side', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ email: 'new@b.com', exists: false, nextStep: 'REGISTER' })
    );

    renderAuthForm();

    await user.type(screen.getByLabelText('Email'), 'new@b.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText('Password'), '123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeTruthy();
    // Only the email-check call happened; register was never attempted.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows an unreachable error when the network fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    renderAuthForm();

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Could not reach the server. Try again shortly.')).toBeTruthy();
  });
});
