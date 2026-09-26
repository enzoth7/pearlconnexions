'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';

type FormStatus = 'idle' | 'submitting' | 'unconfigured' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 503) {
        setStatus('unconfigured');
        return;
      }

      if (!response.ok) {
        setStatus('error');
        return;
      }

      form.reset();
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="contact-name">Name</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="contact-subject">Subject</label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          maxLength={160}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          name="description"
          rows={7}
          maxLength={5000}
          required
        />
      </div>
      <button
        className="button primary contact-submit"
        type="submit"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? (
          <>
            Preparing <LoaderCircle className="loading-icon" />
          </>
        ) : (
          <>
            Send message <ArrowRight />
          </>
        )}
      </button>
      <div className="form-status" role="status" aria-live="polite">
        {status === 'unconfigured' &&
          'The form is ready, but email delivery has not been connected yet.'}
        {status === 'error' &&
          'We could not process the form. Please email operations@pearlconnexions.com.'}
      </div>
    </form>
  );
}
