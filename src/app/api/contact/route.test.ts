import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ sendContactEmail: vi.fn() }));

vi.mock('@/lib/resend', () => ({ sendContactEmail: mocks.sendContactEmail }));

import { POST } from './route';

function contactRequest(body: unknown) {
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    mocks.sendContactEmail.mockReset();
  });

  it('rejects invalid input without sending an email', async () => {
    const response = await POST(contactRequest({}));

    expect(response.status).toBe(400);
    expect(mocks.sendContactEmail).not.toHaveBeenCalled();
  });

  it('accepts a message only after Resend accepts delivery', async () => {
    mocks.sendContactEmail.mockResolvedValue(undefined);

    const response = await POST(contactRequest({
      name: ' Ada Lovelace ',
      email: ' ada@example.com ',
      subject: ' Help ',
      message: ' Please help with my account. ',
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.sendContactEmail).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Help',
      message: 'Please help with my account.',
    });
  });

  it('reports a delivery failure without returning message content', async () => {
    mocks.sendContactEmail.mockRejectedValue(new Error('Resend is unavailable'));

    const response = await POST(contactRequest({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Help',
      message: 'Please help with my account.',
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'Unable to send message' });
  });
});
