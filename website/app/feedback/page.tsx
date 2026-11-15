import type { Metadata } from 'next';
import { FeedbackForm } from '@/components/FeedbackForm';
import { ArrowLink, Icon } from '@/components/pc';
import { complaintsEmail } from '@/lib/contact';

export const metadata: Metadata = {
  title: 'Feedback and complaints',
  description:
    'How to share feedback or raise a concern with Pearl Connexions, what happens next and how to contact the Care Quality Commission.',
};

const sections = [
  { id: 'raise-a-concern', title: 'How to raise a concern' },
  { id: 'what-happens-next', title: 'What happens next' },
  { id: 'quarterly-feedback', title: 'Quarterly feedback' },
  { id: 'cqc', title: 'Care Quality Commission' },
  { id: 'send-feedback', title: 'Send us feedback' },
];

const ways = [
  'Speak to your support worker or key worker.',
  'Speak to the Registered Manager.',
  'Fill in a complaints form. Ask staff for one, or use the form below.',
  'Ask someone you trust, or an advocate, to help you.',
];

const steps = [
  {
    title: 'We confirm we have it',
    text: 'We reply within five working days to let you know we have received your complaint.',
  },
  {
    title: 'We look into it',
    text: 'The Registered Manager looks into your concern, talks with you and keeps you updated.',
  },
  {
    title: 'If you are still unhappy',
    text: 'Tell us. A senior manager who was not involved will review your complaint again.',
  },
];

export default function FeedbackPage() {
  return (
    <main id="content">
      <section className="pc-legal-header">
        <div className="shell">
          <h1>Feedback and complaints</h1>
          <p className="pc-legal-intro">
            We want to know what is working well and what we could do better.
            You can talk to us about anything you are happy or unhappy with.
            Making a complaint will not get you into trouble or affect your
            support.
          </p>
        </div>
      </section>

      <div className="shell pc-legal-body">
        <nav className="pc-legal-index" aria-label="On this page">
          <p>On this page</p>
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pc-faq-content pc-feedback-content">
          <section id="raise-a-concern">
            <h2>How to raise a concern</h2>
            <p>Choose whichever way feels easiest for you.</p>
            <ul className="pc-check-list">
              {ways.map((way) => (
                <li key={way}>
                  <Icon name="tick" width={19} height={13} />
                  {way}
                </li>
              ))}
              <li>
                <Icon name="tick" width={19} height={13} />
                <div>
                  Email your complaint to{' '}
                  <a href={`mailto:${complaintsEmail}`}>{complaintsEmail}</a>.
                </div>
              </li>
            </ul>
            <strong className="pc-feedback-emergency">
              If someone is in immediate danger, call 999.
            </strong>
          </section>

          <section id="what-happens-next">
            <h2>What happens next</h2>
            <ol className="pc-number-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <strong className="pc-number-steps-n" aria-hidden="true">
                    {index + 1}
                  </strong>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="quarterly-feedback">
            <h2>Quarterly feedback</h2>
            <p>
              Every three months we send out a short questionnaire so you can tell
              us what you think about your support and the service.
            </p>
            <p>
              Your answers help us see what we are doing well, find what needs to
              improve and make our work with you better.
            </p>
          </section>

          <section id="cqc">
            <h2>Care Quality Commission</h2>
            <p>
              The Care Quality Commission (CQC) regulates health and adult social
              care services in England. You can also give CQC feedback about your
              care.
            </p>
            <ArrowLink href="https://www.cqc.org.uk/give-feedback-on-care" external>
              Give feedback to CQC
            </ArrowLink>
          </section>

          <section className="pc-form-card" id="send-feedback" aria-labelledby="send-feedback-heading">
            <h2 id="send-feedback-heading">Send us feedback</h2>
            <p>
              Tell us what went well or what we could do better. If you would like
              a reply, leave a way for us to contact you.
            </p>
            <FeedbackForm />
          </section>
        </div>
      </div>
    </main>
  );
}
