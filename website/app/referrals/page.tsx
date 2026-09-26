import type { Metadata } from 'next';
import { Check, Mail, Phone } from 'lucide-react';
export const metadata: Metadata = { title: 'Referrals' };
const steps = [
  [
    'Start the conversation',
    'Tell us about the person, their needs, goals and current circumstances.',
  ],
  [
    'Explore the fit',
    'We consider needs, compatibility, safeguarding and whether we can provide the right support.',
  ],
  [
    'Plan together',
    'If the referral progresses, we coordinate a careful transition with the person and their network.',
  ],
];
export default function Referrals() {
  return (
    <main id="content">
      <section className="referral-hero">
        <div className="shell referral-hero-grid">
          <div>
            <h1>
              Your referral.
              <br />
              Their next chapter.
            </h1>
            <div className="lede">
              We welcome conversations from local authorities, ICBs, NHS teams,
              social workers, case managers, families and advocates.
            </div>
          </div>
          <aside className="contact-card">
            <div className="contact-label">Speak directly with</div>
            <h2>Joel Samuel</h2>
            <div className="contact-role">Director & Operations Manager</div>
            <a href="tel:+447470906740">
              <Phone />
              07470 906 740
            </a>
            <a href="mailto:operations@pearlconnexions.com">
              <Mail />
              operations@pearlconnexions.com
            </a>
          </aside>
        </div>
      </section>
      <section className="section shell">
        <div className="section-heading">
          <h2>A clear, considered referral journey.</h2>
        </div>
        <div className="steps-grid">
          {steps.map(([title, copy], i) => (
            <article key={title}>
              <div className="step-number">{i + 1}</div>
              <h3>{title}</h3>
              <div className="step-copy">{copy}</div>
            </article>
          ))}
        </div>
      </section>
      <section className="referral-details">
        <div className="shell referral-details-grid">
          <div>
            <h2>Help us understand the whole person.</h2>
            <div className="section-copy">
              Share what is available and relevant. We will let you know
              promptly if we need anything else.
            </div>
          </div>
          <ul>
            <li>
              <Check />
              Current assessment and support needs
            </li>
            <li>
              <Check />
              Risk and safeguarding information
            </li>
            <li>
              <Check />
              Communication, identity and preferences
            </li>
            <li>
              <Check />
              Education, health or pathway plans
            </li>
            <li>
              <Check />
              Timescale and desired outcomes
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
