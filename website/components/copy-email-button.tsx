'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

type CopyStatus = 'idle' | 'copied' | 'error';

export function CopyEmailButton({ email }: { email: string }) {
  const [status, setStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timeout = window.setTimeout(() => setStatus('idle'), 2500);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }

  const label =
    status === 'copied'
      ? 'Email copied'
      : status === 'error'
        ? 'Could not copy email'
        : 'Copy email address';

  return (
    <div className="contact-copy-control">
      <button
        className="contact-copy-button"
        type="button"
        onClick={copyEmail}
        aria-label={label}
        title={label}
      >
        {status === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
      <span className="contact-copy-status" role="status">
        {status === 'idle' ? '' : label}
      </span>
    </div>
  );
}
