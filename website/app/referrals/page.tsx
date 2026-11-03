import type { Metadata } from 'next';
import { Check, Mail, Phone } from 'lucide-react';
import {
  referralEmail,
  referralPhone,
  referralPhoneHref,
} from '@/lib/contact';

export const metadata: Metadata = {
  title: 'Referrals',
  description:
    'Discuss a supported living placement with Pearl Connexions. Start with an anonymised profile and agree a secure route for sensitive information.',
};

const steps = [
  [
    'Review the referral',
    'Consider strengths, wishes, needs, risks, legal arrangements, service scope and information gaps.',
  ],
  [
    'Speak with the network',
    'Clarify the current plan, placement history, desired outcomes and what has helped before.',
  ],
  [
    'Meet and assess',
    'Meet the person and arrange a viewing where practicable. Consider communication, location and compatibility.',
  ],
  [
    'Agree the offer',
    'Set out support, staffing, costs, responsibilities and a transition plan before admission.',
  ],
  [
    'Review the start',
    'Check the person’s experience, emerging needs and whether the support model is working.',
  ],
];

const initialDetails = [
  'Age and preferred area',
  'Required start date',
  'Communication and support needs',
  'Key risks and safety considerations',
  'Intended outcomes',
];

export default function Referrals() {
  return (
    <main id="content">
      <section className="referral-hero">
        <div className="shell referral-hero-grid">
          <div>
            <h1>A clear start to a placement discussion.</h1>
            <div className="lede">
              We welcome enquiries from commissioners, social workers,
              leaving care teams and other relevant professionals. Share an
              anonymised profile first so we can discuss fit and next steps.
            </div>
          </div>
          <aside className="contact-card">
            <h2>Speak with Pearl</h2>
            <div className="contact-role">
              We will discuss suitability, current capacity and assessment
              arrangements.
            </div>
            <a href={referralPhoneHref}>
              <Phone /> {referralPhone}
            </a>
            <a href={`mailto:${referralEmail}`}>
              <Mail /> {referralEmail}
            </a>
          </aside>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <h2>From referral to early review.</h2>
          <div className="section-intro homes-intro">
            A responsive process still needs a clear assessment, agreed
            responsibilities and a support model everyone understands.
          </div>
        </div>
        <div className="steps-grid">
          {steps.map(([title, copy]) => (
            <article key={title}>
              <h3>{title}</h3>
              <div className="step-copy">{copy}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="referral-details">
        <div className="shell referral-details-grid">
          <div>
            <h2>What to send first.</h2>
            <div className="section-copy">
              Start with an anonymised profile. Please agree a secure route
              with us before sending identifiable assessments or sensitive
              records.
            </div>
          </div>
          <ul>
            {initialDetails.map((detail) => (
              <li key={detail}>
                <Check aria-hidden="true" /> {detail}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section shell about-intro">
        <h2>A proposed package reflects the person’s needs.</h2>
        <div>
          <div className="body-copy">
            Staffing, costs and the basis of support are discussed after
            assessment and against the service’s scope. If an initial
            assessment period is useful, its length, staffing and review date
            are agreed for that person.
          </div>
          <div className="body-copy">
            Reviews consider the person’s voice, observed skills, support
            still needed and any change in risk. Staffing changes are not
            automatic.
          </div>
        </div>
      </section>
    </main>
  );
}
