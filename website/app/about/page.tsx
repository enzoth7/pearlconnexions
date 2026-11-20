import type { Metadata } from 'next';
import Image from 'next/image';
import TeamRoles from '@/components/TeamRoles';
import WorkforceSection from '@/components/WorkforceSection';

export const metadata: Metadata = {
  title: 'Our Approach',
  description:
    'How Pearl Connexions approaches placement matching, practical independence, staff preparation and progress reviews.',
};

const progressSteps = [
  ['01', 'Start with the person', 'Establish a starting point and agree goals that matter to the individual.'],
  ['02', 'Build skills in daily life', 'Plan practical work and record changes in everyday skills and engagement.'],
  ['03', 'Review together', 'Discuss what changed, adapt the support and choose the next useful goal.'],
];

// Illustrative Charting Your Path record. Not a real resident's outcome.
const progressExample = [
  ['Personal goal', 'Prepare an evening meal with less support.'],
  ['Starting point', 'Cooks with step-by-step prompts from staff and does not yet feel confident using the oven alone.'],
  ['Agreed work', 'Choose a meal, write a shopping list, shop and cook with the keyworker twice a week.'],
  ['Review', 'After six weeks, plans and cooks a simple meal with one check-in, and says cooking feels less stressful.'],
  ['Next goal', 'Cook a meal for a housemate, then try a new recipe each month.'],
];

// Placeholder portraits are stock photos, not the people quoted.
// Publish only with each person's permission and their own photo.
const testimonials = [
  {
    quote:
      'We have absolute confidence in Pearl Connexions’ capacity to deliver exceptional, person-centred care that meets regulatory standards and the complex needs of their service users.',
    name: 'Simone Barclay',
    role: 'Interim Strategic Resource Manager, London Borough of Hackney',
    photo: '/images/people/simone-barclay-placeholder.webp',
  },
  {
    quote:
      'The professionalism of all staff with whom I have liaised and attended meetings with is ‘second to none’, and I would have to say ‘outstanding’.',
    name: 'Fiona Carey RGN',
    role: 'Looked After Children’s Nurse, NHS',
    photo: '/images/people/fiona-carey-placeholder.webp',
  },
  {
    quote:
      'As you know, I now recommend you to other partners due to the gold standard plan you brought in. You were pivotal in reducing demand and risk.',
    name: 'Sgt Verity Haylett',
    role: 'Metropolitan Police',
    photo: '/images/people/verity-haylett-placeholder.webp',
  },
  {
    quote:
      'Throughout our joint work, Caiden and others have consistently demonstrated exceptional professionalism, empathy and commitment.',
    name: 'Sue Kale',
    role: 'Parenting Officer / Case Manager, Merton Youth Justice Service',
    photo: '/images/people/sue-kale-placeholder.webp',
  },
];

export default function AboutPage() {
  return (
    <main id="content">
      <section className="pc-page-hero">
        <div className="shell pc-page-hero-grid">
          <div>
            <h1 className="pc-h1">The person shapes the placement.</h1>
            <p className="pc-lede">
              We bring the right environment, consistent relationships and
              purposeful support together with the person and their professional
              network.
            </p>
          </div>
          <div className="pc-circle-photo">
            <Image
              className="pc-photo"
              src="/images/about/hero-cooking.webp"
              alt="A young woman cooking at home"
              width={1600}
              height={1067}
              sizes="(max-width: 900px) 90vw, 466px"
              priority
            />
          </div>
        </div>
      </section>

      <section className="pc-two-col-statement">
        <div className="shell pc-two-col">
          <h2 className="pc-h2">Careful matching. Clear goals. Early review.</h2>
          <div className="pc-muted-copy">
            <p>
              Assessment considers strengths, wishes, communication, daily
              support needs, risks, geography and compatibility with existing
              residents. A vacancy alone does not establish suitability.
            </p>
            <p>
              With the person, we agree practical goals for wellbeing,
              relationships, everyday living and education or employment where
              appropriate. We review what is changing and adjust the plan with the
              relevant professionals.
            </p>
          </div>
        </div>
      </section>

      <section className="pc-team">
        <div className="shell">
          <h2 className="pc-h2">Meet the team</h2>
          <p className="pc-muted-copy pc-team-intro">
            Each role has a clear responsibility, from the first referral to
            everyday support in the home.
          </p>
          <TeamRoles />
        </div>
      </section>

      <section className="pc-progress">
        <div className="shell">
          <div className="pc-progress-top">
            <div className="pc-progress-intro">
              <h2>Make progress visible.</h2>
              <p className="pc-progress-lead">
                Personal goals. Practical skills. A clearer picture of what
                changes.
              </p>
              <p>
                Charting Your Path helps care leavers and young people aged 16+
                build confidence and independence, with goals and reviews shaped
                around them.
              </p>
            </div>
            <div className="pc-progress-gallery">
              <Image
                className="pc-photo pc-shape-a"
                src="/images/about/progress-meal-hd.webp"
                alt="A young woman preparing a meal in a kitchen"
                width={2560}
                height={1440}
                unoptimized
                sizes="(max-width: 900px) 60vw, 400px"
              />
              <Image
                className="pc-photo pc-shape-b"
                src="/images/about/progress-application.webp"
                alt="Two people working through an application on a laptop"
                width={1600}
                height={2400}
                sizes="(max-width: 900px) 40vw, 240px"
              />
            </div>
          </div>
          <ol className="pc-progress-steps">
            {progressSteps.map(([n, title, text]) => (
              <li key={n}>
                <span className="pc-step-number">{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <div className="pc-progress-footer">
            <h3>Progress you can see in everyday life.</h3>
            <p>
              Managing money, keeping appointments, learning and work,
              relationships and community confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="pc-progress-example" aria-labelledby="progress-example-heading">
        <div className="shell pc-progress-example-grid">
          <div className="pc-progress-example-head">
            <h2 className="pc-h2" id="progress-example-heading">
              How we recognise progress.
            </h2>
            <p>
              Charting Your Path supports a structured conversation about goals
              and change over time. This example shows the format. It is not a
              real resident’s outcome.
            </p>
          </div>
          <dl className="pc-progress-record">
            {progressExample.map(([label, text]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <WorkforceSection />

      <section className="pc-testimonials" aria-labelledby="testimonials-heading">
        <div className="shell">
          <h2 className="pc-h2-large" id="testimonials-heading">
            What professionals say.
          </h2>
          <div className="pc-quote-grid">
            {testimonials.map((item) => (
              <figure className="pc-quote" key={item.name}>
                <span className="pc-quote-mark" aria-hidden="true">
                  “
                </span>
                <blockquote>{item.quote}</blockquote>
                <figcaption>
                  <Image
                    className="pc-photo"
                    src={item.photo}
                    alt=""
                    width={104}
                    height={104}
                  />
                  <span>
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="pc-card-section">
        <div className="shell">
          <div className="pc-rounded-card pc-network-card">
            <div>
              <h2 className="pc-h2">Work with the wider professional network.</h2>
              <p>
                Social care, leaving care, health, education, youth justice and
                other professionals are involved where relevant. Emerging concerns
                are shared early so the support and safety plans can respond to
                what is happening.
              </p>
              <p>
                The person’s views should inform assessment, key work, reviews
                and transition planning in ways that work for their communication
                and understanding.
              </p>
            </div>
            <Image
              className="pc-photo pc-network-photo"
              src="/images/about/professional-network.webp"
              alt="A young man speaking during a meeting"
              width={1600}
              height={2400}
              sizes="(max-width: 900px) 100vw, 520px"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
