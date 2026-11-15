import type { Metadata } from 'next';
import { Icon, OffsetPhoto } from '@/components/pc';
import { BrushedEdge } from '@/components/pc-blocks';
import { withPlaceholders } from '@/components/LegalPage';
import { hrEmail } from '@/lib/contact';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Work at Pearl Connexions. See current opportunities, our induction and training, and how to send your CV.',
};

const working = [
  {
    icon: 'navigation',
    w: 40,
    h: 40,
    title: 'A structured induction',
    text: 'Training before and after you start, including the Care Certificate, safeguarding and Oliver McGowan training on learning disability and autism.',
  },
  {
    icon: 'trendup',
    w: 40,
    h: 20,
    title: 'Ongoing development',
    text: 'Learning in mental health awareness, trauma-informed support, PMVA and de-escalation, with time to build your skills.',
  },
  {
    icon: 'shield',
    w: 40,
    h: 40,
    title: 'Safe, reflective practice',
    text: 'Regular supervision and reflective discussions, and safer recruitment checks for every role, including an enhanced DBS check and references.',
  },
];

export default function CareersPage() {
  return (
    <main id="content">
      <section className="pc-tint-hero pc-careers-hero">
        <div className="shell pc-tint-hero-inner pc-gap-80">
          <OffsetPhoto
            src="/images/careers/team-huddle.webp"
            alt="A group of colleagues smiling together in a huddle"
            width={1600}
            height={1067}
            outline="right"
            frame={{ w: 420, h: 420 }}
            priority
          />
          <div className="pc-tint-hero-text">
            <h1>Help someone take their next step.</h1>
            <p className="pc-tint-hero-intro">
              Join a team that values respectful relationships, learning and
              everyday progress, and helps people feel supported in everyday
              life.
            </p>
          </div>
        </div>
        <BrushedEdge />
      </section>

      <section className="pc-careers-roles" id="roles">
        <div className="shell pc-careers-roles-grid">
          <div className="pc-careers-roles-head">
            <h2>Current opportunities.</h2>
            <p>
              We list confirmed roles here, each with a job description and a
              clear way to apply.
            </p>
          </div>
          <div className="pc-careers-empty">
            <h3>No current vacancies</h3>
            <p>
              We are not recruiting right now. If you would like to work with us
              in the future, send your CV and a short note about the kind of role
              you are interested in.
            </p>
            <a className="pc-careers-email" href={`mailto:${hrEmail}`}>
              <Icon name="mail-c" width={15} height={12} />
              {hrEmail}
            </a>
            <a className="pc-button" href={`mailto:${hrEmail}?subject=Working%20at%20Pearl%20Connexions`}>
              Email HR
            </a>
            <small className="pc-careers-privacy">
              {withPlaceholders(
                'We use your details only to consider you for a role. [Applicant privacy notice to confirm.]',
              )}
            </small>
          </div>
        </div>
      </section>

      <section className="pc-careers-working">
        <div className="shell">
          <h2>What working at Pearl looks like.</h2>
          <div className="pc-careers-working-grid">
            {working.map((item) => (
              <div className="pc-careers-working-item" key={item.title}>
                <div className="pc-icon-slot">
                  <Icon name={item.icon} width={item.w} height={item.h} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
