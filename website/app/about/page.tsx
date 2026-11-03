import type { Metadata } from 'next';
import Image from 'next/image';
import {
  BookOpenCheck,
  HeartHandshake,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Our Approach',
  description:
    'How Pearl Connexions approaches placement matching, practical independence, staff preparation and progress reviews.',
};

const training = [
  {
    title: 'Learning disability and autism',
    copy: 'Communication, sensory needs, predictable routines and person-specific adjustments. Oliver McGowan training is included where applicable to staff roles.',
    icon: BookOpenCheck,
  },
  {
    title: 'Trauma-informed practice',
    copy: 'Understanding behaviour in the context of experience, relationships and what helps the person feel safe.',
    icon: HeartHandshake,
  },
  {
    title: 'Safeguarding and risk',
    copy: 'Recognising contextual risks, sharing concerns appropriately and responding before difficulties escalate.',
    icon: ShieldCheck,
  },
  {
    title: 'Reflective supervision',
    copy: 'Management oversight, professional boundaries and review of the support provided in each setting.',
    icon: UsersRound,
  },
];

const teamRoles = [
  { role: 'Director & Operations', image: '/team/team-member-01.jpg' },
  { role: 'Placement Coordination', image: '/team/team-member-02.jpg' },
  { role: 'Finance & Business', image: '/team/team-member-03.jpg' },
  { role: 'People & Culture', image: '/team/team-member-04.jpg' },
  { role: 'Supported Living', image: '/team/team-member-05.jpg' },
  { role: 'Children’s Services', image: '/team/team-member-06.jpg' },
];

export default function About() {
  return (
    <main id="content">
      <section className="page-hero provision-hero about-hero">
        <div className="shell about-hero-grid">
          <div>
            <h1>The person shapes the placement.</h1>
            <div className="lede">
              We bring the right environment, consistent relationships and
              purposeful support together with the person and their
              professional network.
            </div>
          </div>
          <div className="about-symbol">
            <div className="about-team-crop">
              <Image
                className="about-team-photo"
                src="/about-team-portrait.webp"
                fill
                alt="Group portrait from the Pearl Connexions team artwork"
                priority
                unoptimized
                sizes="(max-width: 860px) 90vw, 476px"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section shell about-intro">
        <h2>Careful matching. Clear goals. Early review.</h2>
        <div>
          <div className="body-copy">
            Assessment considers strengths, wishes, communication, daily
            support needs, risks, geography and compatibility with existing
            residents. A vacancy alone does not establish suitability.
          </div>
          <div className="body-copy">
            With the person, we agree practical goals for wellbeing,
            relationships, everyday living and education or employment where
            appropriate. We review what is changing and adjust the plan with
            the relevant professionals.
          </div>
        </div>
      </section>

      <section className="section about-team-section">
        <div className="shell">
          <div className="section-heading">
            <h2>Meet the team</h2>
            <div className="section-intro homes-intro">
              These are reference portraits. Names and final roles will be
              added when the team photography is approved.
            </div>
          </div>
          <div className="team-grid">
            {teamRoles.map((member, index) => (
              <article className="team-card" key={member.role}>
                <div className="team-photo">
                  <Image
                    src={member.image}
                    alt={`Reference portrait for ${member.role}`}
                    fill
                    sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  />
                </div>
                <div className="team-card-content">
                  <h3>Team member {String(index + 1).padStart(2, '0')}</h3>
                  <div>{member.role}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="team-band">
        <div className="shell">
          <div className="section-heading">
            <h2>Make progress visible.</h2>
            <div className="section-intro homes-intro">
              Charting Your Path is a structured life-skills programme for care
              leavers and young people aged 16+, used where it fits the
              individual’s goals and needs.
            </div>
          </div>
          <div className="pillar-grid">
            <article>
              <h3>Start with a baseline</h3>
              <div className="pillar-copy">
                Understand what the person already manages and where support
                is needed.
              </div>
            </article>
            <article>
              <h3>Agree practical goals</h3>
              <div className="pillar-copy">
                Plan key work around skills such as communication, budgeting,
                relationships, health and safer choices.
              </div>
            </article>
            <article>
              <h3>Review the change</h3>
              <div className="pillar-copy">
                Discuss examples of skills demonstrated, the support still
                needed and the next goal.
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <h2>A workforce prepared for the person.</h2>
          <div className="section-intro homes-intro">
            Training and supervision should translate into how staff
            communicate, recognise distress, make adjustments and respond
            safely.
          </div>
        </div>
        <div className="training-grid">
          {training.map(({ title, copy, icon: Icon }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <div className="training-copy">{copy}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="section approach-section about-network-section">
        <div className="shell about-network-grid">
          <div className="about-network-copy">
            <h2>Work with the wider professional network.</h2>
            <div className="body-copy">
              Social care, leaving care, health, education, youth justice and
              other professionals are involved where relevant. Emerging
              concerns are shared early so the support and safety plans can
              respond to what is happening.
            </div>
            <div className="body-copy">
              The person’s views should inform assessment, key work, reviews
              and transition planning in ways that work for their
              communication and understanding.
            </div>
          </div>
          <div className="about-network-image">
            <Image
              src="/about-professional-network.webp"
              alt="Professionals discussing plans together around a table"
              fill
              sizes="(max-width: 860px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
