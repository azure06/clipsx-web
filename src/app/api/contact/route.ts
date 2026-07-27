import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendContactEmail } from '@/lib/resend';

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  subject: z.string().trim().min(1).max(300),
  message: z.string().trim().min(10).max(10_000),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  try {
    await sendContactEmail(parsed.data);
  } catch (error) {
    console.error('Contact message delivery failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Unable to send message' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
