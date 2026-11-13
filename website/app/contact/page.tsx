import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { CopyEmailButton } from '@/components/copy-email-button';
import { Icon } from '@/components/pc';
import { BrushedEdge } from '@/components/pc-blocks';
import {
  officeAddress,
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
      <section className="pc-tint-hero pc-contact-hero">
        <div className="shell pc-tint-hero-inner pc-gap-80">
          <div className="pc-offset-photo outline-right pc-contact-photo">
            <Image
              className="pc-photo"
              src="/images/contact/phone-call-hd.webp"
              alt="A woman smiling while talking on the phone at a laptop"
              width={2800}
              height={1867}
              unoptimized
              sizes="(max-width: 900px) 100vw, 420px"
              priority
            />
          </div>
          <div className="pc-tint-hero-text">
            <Icon name="spark-marks" width={64} height={44} className="pc-spark" />
            <h1>Start a conversation.</h1>
            <p className="pc-tint-hero-intro pc-contact-intro">
              Ask about a supported living setting, a potential referral or a
              service being planned. We can discuss fit, current capacity and
              next steps.
            </p>
          </div>
        </div>
        <BrushedEdge />
      </section>

      <section className="pc-contact-details">
        <div className="shell pc-contact-grid">
          <div>
            <h2 className="pc-contact-heading">Email or call us.</h2>
            <ul className="pc-contact-list">
              <li>
                <a href={`mailto:${referralEmail}`}>
                  <Icon name="mail-navy-22" width={22} height={18} />
                  <span>
                    <span className="pc-contact-label">Email</span>
                    <span className="pc-contact-value">{referralEmail}</span>
                  </span>
                </a>
                <CopyEmailButton email={referralEmail} />
              </li>
              <li>
                <a href={referralPhoneHref}>
                  <Icon name="phone-navy-13" width={13} height={22} />
                  <span>
                    <span className="pc-contact-label">Telephone</span>
                    <span className="pc-contact-value">{referralPhone}</span>
                  </span>
                </a>
              </li>
              <li>
                <div className="pc-contact-office">
                  <Icon name="location-navy" width={13} height={22} />
                  <span>
                    <span className="pc-contact-label">Office</span>
                    <span className="pc-contact-value">
                      {officeAddress.street}, {officeAddress.cityAndPostcode}
                    </span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <aside className="pc-enquiry-card">
            <h2>For a placement enquiry</h2>
            <p>
              Send an anonymised profile with the person’s age, preferred area,
              required start date, communication and support needs, key risks and
              intended outcomes.
            </p>
            <p>
              Please agree a secure route with us before sending identifiable
              assessments or sensitive records.
            </p>
            <Link href="/referrals">See the referral process</Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
