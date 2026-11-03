import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import { CopyEmailButton } from '@/components/copy-email-button';
import {
  referralEmail,
  referralPhone,
  referralPhoneHref,
} from '@/lib/contact';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Pearl Connexions about supported living, a placement discussion or future services in South London.',
};

export default function ContactPage() {
  return (
    <main id="content">
      <section className="contact-page">
        <div className="shell contact-page-grid">
          <div className="contact-page-copy">
            <h1>Start a conversation.</h1>
            <div className="lede">
              Ask about a supported living setting, a potential referral or a
              service being planned. We can discuss fit, current capacity and
              next steps.
            </div>
            <div className="contact-direct">
              <div className="contact-email-row">
                <a href={`mailto:${referralEmail}`}>
                  <Mail />
                  <div>
                    <strong>Email</strong>
                    <div>{referralEmail}</div>
                  </div>
                </a>
                <CopyEmailButton email={referralEmail} />
              </div>
              <a href={referralPhoneHref}>
                <Phone />
                <div>
                  <strong>Telephone</strong>
                  <div>{referralPhone}</div>
                </div>
              </a>
            </div>
          </div>
          <aside className="contact-form contact-guide">
            <h2>For a placement enquiry</h2>
            <div className="body-copy">
              Send an anonymised profile with the person’s age, preferred
              area, required start date, communication and support needs, key
              risks and intended outcomes.
            </div>
            <div className="body-copy">
              Please agree a secure route with us before sending identifiable
              assessments or sensitive records.
            </div>
            <Link className="text-link" href="/referrals">
              See the referral process
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
