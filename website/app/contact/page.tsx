import type { Metadata } from 'next';
import { Mail, Phone } from 'lucide-react';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Pearl Connexions about our homes, services or referrals.',
};

export default function ContactPage() {
  return (
    <main id="content">
      <section className="contact-page">
        <div className="shell contact-page-grid">
          <div className="contact-page-copy">
            <h1>Let’s start a conversation.</h1>
            <div className="lede">
              Ask about a service, a home or a potential referral. Share the
              essentials and our team will know how best to respond.
            </div>
            <div className="contact-direct">
              <a href="mailto:operations@pearlconnexions.com">
                <Mail />
                <div>
                  <strong>Email</strong>
                  <div>operations@pearlconnexions.com</div>
                </div>
              </a>
              <a href="tel:+447470906740">
                <Phone />
                <div>
                  <strong>Telephone</strong>
                  <div>07470 906 740</div>
                </div>
              </a>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
