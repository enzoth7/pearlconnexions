import { NextResponse } from 'next/server';

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  description?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let payload: ContactPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const subject =
    typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : '';

  if (
    !name ||
    name.length > 100 ||
    !emailPattern.test(email) ||
    email.length > 254 ||
    !subject ||
    subject.length > 160 ||
    !description ||
    description.length > 5000
  ) {
    return NextResponse.json(
      { ok: false, error: 'Please check the submitted fields.' },
      { status: 400 },
    );
  }

  // Resend will be connected here later. Keep the validated payload shape
  // stable so the UI will not need to change when delivery is enabled.
  return NextResponse.json(
    {
      ok: false,
      code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
    },
    { status: 503 },
  );
}
