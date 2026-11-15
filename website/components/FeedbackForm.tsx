'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { complaintsEmail, referralPhone, referralPhoneHref } from '@/lib/contact';

type Status = 'idle' | 'sending' | 'sent' | 'unavailable' | 'error';

/** Feedback and complaints form. Name and contact details are optional. */
export function FeedbackForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [messageError, setMessageError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const message = String(data.get('message') ?? '').trim();

    if (!message) {
      setMessageError('Please tell us your feedback or complaint.');
      form.querySelector<HTMLTextAreaElement>('#feedback-message')?.focus();
      return;
    }
    setMessageError('');
    setStatus('sending');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') ?? '').trim(),
          contact: String(data.get('contact') ?? '').trim(),
          message,
        }),
      });
      if (response.ok) {
        form.reset();
        setStatus('sent');
      } else {
        setStatus(response.status === 503 ? 'unavailable' : 'error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <form className="pc-form" onSubmit={handleSubmit} noValidate>
      <div className="pc-field">
        <label htmlFor="feedback-name">Your name (optional)</label>
        <input id="feedback-name" name="name" type="text" autoComplete="name" maxLength={100} placeholder="e.g. Sam" />
      </div>
      <div className="pc-field">
        <label htmlFor="feedback-contact">Email or telephone (optional)</label>
        <input
          id="feedback-contact"
          name="contact"
          type="text"
          autoComplete="email"
          maxLength={254}
          placeholder="So we can reply to you"
        />
      </div>
      <div className="pc-field">
        <label htmlFor="feedback-message">Your feedback or complaint</label>
        <textarea
          id="feedback-message"
          name="message"
          rows={5}
          maxLength={5000}
          placeholder="Tell us what happened or what you would like to change"
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? 'feedback-message-error' : undefined}
        />
        {messageError ? (
          <small className="pc-field-error" id="feedback-message-error">
            {messageError}
          </small>
        ) : null}
      </div>
      <small className="pc-form-note">
        We use these details only to respond to your feedback. Read our{' '}
        <Link href="/privacy-notice">privacy notice</Link>.
      </small>
      <div>
        <button className="pc-button" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
      <div className="pc-form-status" role="status" aria-live="polite">
        {status === 'sent' ? 'Thank you. Your feedback has been sent.' : null}
        {status === 'unavailable' || status === 'error' ? (
          <>
            We could not send your feedback just now. Please email{' '}
            <a href={`mailto:${complaintsEmail}`}>{complaintsEmail}</a> or call{' '}
            <a href={referralPhoneHref}>{referralPhone}</a>.
          </>
        ) : null}
      </div>
    </form>
  );
}
