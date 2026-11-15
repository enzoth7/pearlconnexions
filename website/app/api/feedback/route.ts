import { NextResponse } from 'next/server';

type FeedbackPayload = {
  name?: unknown;
  contact?: unknown;
  message?: unknown;
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export async function POST(request: Request) {
  let payload: FeedbackPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const name = text(payload.name);
  const contact = text(payload.contact);
  const message = text(payload.message);

  if (name.length > 100 || contact.length > 254 || !message || message.length > 5000) {
    return NextResponse.json(
      { ok: false, error: 'Please check the submitted fields.' },
      { status: 400 },
    );
  }

  // Delivery to the complaints mailbox will be connected with the contact
  // form's email provider. Until then the form shows the email and phone
  // alternatives.
  return NextResponse.json({ ok: false, code: 'EMAIL_PROVIDER_NOT_CONFIGURED' }, { status: 503 });
}
