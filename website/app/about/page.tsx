import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BookOpenCheck,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';
export const metadata: Metadata = { title: 'About us' };
const training = [
  [
    'Trauma-informed approach',
    'Understanding the impact of trauma and responding with empathy.',
  ],
  [
    'Care Certificate',
    'A strong foundation of knowledge and best practice in care.',
  ],
  [
    'Oliver McGowan Training',
    'Better understanding of people with a learning disability and autistic people.',
  ],
  ['Safeguarding', 'Protecting rights, safety, wellbeing and dignity.'],
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
      <section className="page-hero about-hero">
        <div className="shell page-hero-grid">
          <div>
            <h1>Real people behind meaningful support.</h1>
            <div className="lede">
              Great support starts with people who listen, keep learning and
              genuinely care about the difference they make.
            </div>
          </div>
          <div className="about-symbol">
            <div className="about-team-crop">
              <Image
                className="about-team-photo"
                src="/about-team.jpg"
                width={1600}
                height={975}
                alt="Pearl Connexions team together"
                priority
                sizes="(max-width: 860px) 90vw, 40vw"
              />
            </div>
          </div>
        </div>
      </section>
      <section className="section shell about-intro">
        <div>
          <h2>Empowering independence. Enriching lives.</h2>
        </div>
        <div>
          <div>
            We create safe, nurturing homes and provide personalised support
            that helps people build confidence, wellbeing and meaningful
            community connections.
          </div>
          <div>
            Our approach is practical and relational: understand the person,
            build trust, agree clear goals and celebrate progress—big or small.
          </div>
        </div>
      </section>
      <section className="team-band">
        <div className="shell">
          <div className="section-heading">
            <h2>Meet the team</h2>
            <div className="section-intro homes-intro">
              Temporary reference portraits are shown here. Names and final
              roles will be added with the approved team photography.
            </div>
          </div>
          <div className="team-grid">
            {teamRoles.map((member, i) => (
              <article className="team-card" key={member.role}>
                <div className="team-photo">
                  <Image
                    src={member.image}
                    alt={`Placeholder portrait for ${member.role}`}
                    fill
                    sizes="(max-width: 600px) 100vw, 33vw"
                  />
                </div>
                <div className="team-card-content">
                  <h3>Team member {String(i + 1).padStart(2, '0')}</h3>
                  <div>{member.role}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section shell">
        <div className="section-heading">
          <h2>Training and practice</h2>
        </div>
        <div className="training-grid">
          {training.map(([title, copy], i) => (
            <article key={title}>
              {i === 0 ? (
                <HeartHandshake />
              ) : i === 1 ? (
                <BookOpenCheck />
              ) : i === 2 ? (
                <GraduationCap />
              ) : (
                <ShieldCheck />
              )}
              <h3>{title}</h3>
              <div className="training-copy">{copy}</div>
            </article>
          ))}
        </div>
      </section>
      <section className="section shell values-grid">
        <div className="manifesto-wrap">
          <Image
            src="/manifesto.png"
            width={1034}
            height={1009}
            alt="Pearl Connexions manifesto wheel"
          />
        </div>
        <div>
          <h2>Six values. One connected approach.</h2>
          <div className="lede small">
            Resilience, self-care, guidance, restorative practice, nurturing and
            healing help us turn care into consistent everyday action.
          </div>
          <Link className="button primary" href="/referrals">
            Talk to our team <ArrowRight />
          </Link>
        </div>
      </section>
    </main>
  );
}
