import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailForm } from '@/components/auth/email-form';
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

function renderEmailForm(defaultEmail?: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <EmailForm defaultEmail={defaultEmail} />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('EmailForm', () => {
  it('navigates to /login/password for an existing email', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ email: 'a@b.com', exists: true, nextStep: 'LOGIN' })
    );

    renderEmailForm();

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login/password?email=a%40b.com');
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('navigates to /login/register for a new email', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ email: 'new@b.com', exists: false, nextStep: 'REGISTER' })
    );

    renderEmailForm();

    await user.type(screen.getByLabelText('Email'), 'new@b.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login/register?email=new%40b.com');
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a localized error on server failure', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: 'INVALID_CREDENTIALS' } }, 401));

    renderEmailForm();

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Wrong email or password.')).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('pre-fills email from defaultEmail prop', () => {
    renderEmailForm('prefilled@b.com');
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('prefilled@b.com');
  });

  it('blocks a malformed email client-side before any request', async () => {
    const user = userEvent.setup();
    renderEmailForm();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows an unreachable error when the network fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    renderEmailForm();

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Could not reach the server. Try again shortly.')).toBeTruthy();
  });
});
