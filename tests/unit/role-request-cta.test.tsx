import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoleRequestCta } from '@/components/account/role-request-cta';
import en from '@/messages/en.json';

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('sonner', () => ({ toast: toastMock }));

function renderCta() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RoleRequestCta />
    </NextIntlClientProvider>
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('RoleRequestCta', () => {
  it('renders the trigger button', () => {
    renderCta();
    expect(screen.getByRole('button', { name: 'Request role upgrade' })).toBeTruthy();
  });

  it('opens the dialog on trigger click', async () => {
    const user = userEvent.setup();
    renderCta();

    await user.click(screen.getByRole('button', { name: 'Request role upgrade' }));

    expect(
      screen.getByText('Need more capabilities? Request a role upgrade for your account.')
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeTruthy();
  });

  it('shows success toast and sent state on successful submission', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const user = userEvent.setup();
    renderCta();

    await user.click(screen.getByRole('button', { name: 'Request role upgrade' }));
    await user.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/account/role-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
    });

    expect(toastMock.success).toHaveBeenCalledWith('Role upgrade request sent successfully!');
    expect(screen.getByRole('button', { name: 'Request sent' })).toBeTruthy();
  });

  it('shows error toast when the request fails', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { message: 'Service unavailable.' } }, 503)
    );

    const user = userEvent.setup();
    renderCta();

    await user.click(screen.getByRole('button', { name: 'Request role upgrade' }));
    await user.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Service unavailable.');
    });
  });

  it('shows generic error toast on network failure', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    renderCta();

    await user.click(screen.getByRole('button', { name: 'Request role upgrade' }));
    await user.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Something went wrong. Please try again.');
    });
  });

  it('sends the justification message when filled in', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const user = userEvent.setup();
    renderCta();

    await user.click(screen.getByRole('button', { name: 'Request role upgrade' }));

    const textarea = screen.getByPlaceholderText('Tell us why you need additional permissions...');
    await user.type(textarea, 'I need access to Pro features.');

    await user.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/account/role-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'I need access to Pro features.' }),
      });
    });
  });
});
