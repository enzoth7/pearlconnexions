'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Select } from '@base-ui/react/select';
import { operationsEmail, referralPhone, referralPhoneHref } from '@/lib/contact';

const services = ['Supported Living', 'Supported Accommodation', 'Children’s Home', 'Not sure yet'];

type Status = 'idle' | 'sending' | 'sent' | 'unavailable' | 'error';
type Errors = Partial<Record<'name' | 'email' | 'service' | 'message', string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Placement enquiry form from the Contact page design. */
export function EnquiryForm() {
  const [service, setService] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    const payload = {
      name: value('name'),
      email: value('email'),
      phone: value('phone'),
      service: service ?? '',
      area: value('area'),
      description: value('message'),
    };

    const nextErrors: Errors = {};
    if (!payload.name) nextErrors.name = 'Please add your name and organisation.';
    if (!emailPattern.test(payload.email)) nextErrors.email = 'Please add a valid email address.';
    if (!payload.service) nextErrors.service = 'Please choose a service.';
    if (!payload.description) nextErrors.message = 'Please tell us briefly what you need.';
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      form.querySelector<HTMLElement>(`[data-field="${firstError}"]`)?.focus();
      return;
    }

    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, subject: `Enquiry about ${payload.service}` }),
      });
      if (response.ok) {
        form.reset();
        setService(null);
        setStatus('sent');
      } else {
        setStatus(response.status === 503 ? 'unavailable' : 'error');
      }
    } catch {
      setStatus('error');
    }
  }

  const describedBy = (key: keyof Errors) => (errors[key] ? `enquiry-${key}-error` : undefined);
  const fieldError = (key: keyof Errors) =>
    errors[key] ? (
      <small className="pc-field-error" id={`enquiry-${key}-error`}>
        {errors[key]}
      </small>
    ) : null;

  return (
    <form className="pc-form pc-enquiry-form" onSubmit={handleSubmit} noValidate>
      <div className="pc-field">
        <label htmlFor="enquiry-name">Name and organisation</label>
        <input
          id="enquiry-name"
          name="name"
          data-field="name"
          autoComplete="name"
          maxLength={100}
          placeholder="e.g. Sam Patel, London Borough of Merton"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy('name')}
        />
        {fieldError('name')}
      </div>
      <div className="pc-form-row">
        <div className="pc-field">
          <label htmlFor="enquiry-email">Email</label>
          <input
            id="enquiry-email"
            name="email"
            type="email"
            data-field="email"
            autoComplete="email"
            maxLength={254}
            placeholder="name@organisation.gov.uk"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy('email')}
          />
          {fieldError('email')}
        </div>
        <div className="pc-field">
          <label htmlFor="enquiry-phone">Telephone</label>
          <input
            id="enquiry-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder="Your phone number"
          />
        </div>
      </div>
      <div className="pc-form-row">
        <div className="pc-field">
          <Select.Root value={service} onValueChange={(next) => setService(next as string | null)}>
            <Select.Label className="pc-field-label">
              Service
            </Select.Label>
            <Select.Trigger
              className="pc-select-trigger"
              data-field="service"
              aria-invalid={errors.service ? true : undefined}
              aria-describedby={describedBy('service')}
            >
              <Select.Value placeholder="Choose a service" />
              <Select.Icon className="pc-select-icon">
                <img src="/icons/chevron-down-navy.svg" alt="" width={13} height={9} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="pc-select-positioner" sideOffset={6} alignItemWithTrigger={false}>
                <Select.Popup className="pc-select-popup">
                  <Select.List>
                    {services.map((option) => (
                      <Select.Item className="pc-select-item" key={option} value={option}>
                        <Select.ItemText>{option}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
          {fieldError('service')}
        </div>
        <div className="pc-field">
          <label htmlFor="enquiry-area">Preferred area</label>
          <input id="enquiry-area" name="area" maxLength={100} placeholder="e.g. Croydon or Merton" />
        </div>
      </div>
      <div className="pc-field">
        <label htmlFor="enquiry-message">Brief enquiry</label>
        <textarea
          id="enquiry-message"
          name="message"
          data-field="message"
          rows={5}
          maxLength={5000}
          placeholder="Age, broad support needs and intended timescale. No identifying details, please."
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy('message')}
        />
        {fieldError('message')}
      </div>
      <small className="pc-form-note">
        We use these details only to reply to your enquiry. Read our{' '}
        <Link href="/privacy-notice">Privacy notice</Link>.
      </small>
      <div>
        <button className="pc-button" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send enquiry'}
        </button>
      </div>
      <div className="pc-form-status" role="status" aria-live="polite">
        {status === 'sent' ? 'Thank you. Your enquiry has been sent.' : null}
        {status === 'unavailable' || status === 'error' ? (
          <>
            We could not send your enquiry just now. Please email{' '}
            <a href={`mailto:${operationsEmail}`}>{operationsEmail}</a> or call{' '}
            <a href={referralPhoneHref}>{referralPhone}</a>.
          </>
        ) : null}
      </div>
    </form>
  );
}
