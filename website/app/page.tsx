import Link from 'next/link';
import Image from 'next/image';
import { ArrowLink, CqcCard, Icon, OffsetPhoto, Underline } from '@/components/pc';

const services = [
  {
    href: '/supported-living',
    title: 'Supported Living',
    image: '/images/home/card-supported-living-sofa.webp',
    alt: 'Two young adults laughing together on a sofa at home, one in a wheelchair',
  },
  {
    href: '/supported-accommodation',
    title: 'Supported Accommodation',
    image: '/images/home/card-supported-accommodation-unpacking.webp',
    alt: 'Young man unpacking boxes in his new room',
  },
  {
    href: '/childrens-home',
    title: 'Children’s Home',
    image: '/images/home/card-childrens-home-brick-house.webp',
    alt: 'Red brick family house with a hedge and lawn',
  },
];

const facts = [
  { icon: 'home', w: 51, h: 52, value: '4', label: 'supported living homes across South London' },
  { icon: 'user', w: 52, h: 47, value: '18+', label: 'adults in supported living, building independence' },
  { icon: 'checklist', w: 52, h: 52, value: '6 steps', label: 'from first referral to an early review' },
];

const steps = [
  {
    title: 'Match carefully',
    text: 'Consider wishes, communication, support needs, risk, location and compatibility with existing residents.',
  },
  {
    title: 'Plan useful support',
    text: 'Agree routines and goals for everyday independence, wellbeing and education or employment where appropriate.',
  },
  {
    title: 'Review what changes',
    text: 'Record a starting point, involve the person and their network, and adjust the plan when needs or risks change.',
  },
];

const approach = [
  {
    icon: 'navigation',
    w: 40,
    h: 40,
    title: 'A planned transition',
    text: 'From referral and matching to the first review.',
    href: '/referrals',
    link: 'See the six steps',
  },
  {
    icon: 'trendup',
    w: 40,
    h: 20,
    title: 'Progress with purpose',
    text: 'Personal goals, practical work and evidence of change.',
    href: '/about',
    link: 'Explore our approach',
  },
  {
    icon: 'shield',
    w: 40,
    h: 40,
    title: 'A prepared team',
    text: 'Communication, safeguarding and support tailored to the person.',
    href: '/about',
    link: 'Meet our approach to care',
  },
];

export default function Home() {
  return (
    <main id="content">
      <section className="pc-photo-hero">
        <Image
          className="pc-photo pc-photo-hero-bg"
          src="/images/home/hero.webp"
          alt="Young people laughing together on the grass"
          fill
          priority
          sizes="100vw"
        />
        <div className="shell pc-photo-hero-content">
          <h1 className="pc-boxed-headline">
            <span>The right setting.</span>
            <span>A purposeful next step.</span>
          </h1>
          <div className="pc-text-box">
            <p>
              South London accommodation and support for young people and
              adults, with careful matching, practical life skills and progress
              reviewed together.
            </p>
            <ArrowLink href="/supported-living">Explore supported living</ArrowLink>
          </div>
          <Link className="pc-button pc-button-light pc-button-large" href="/referrals">
            Discuss a placement
          </Link>
        </div>
      </section>

      <section className="pc-facts-band" aria-label="Key facts">
        <div className="shell pc-facts-grid">
          {facts.map((fact) => (
            <div className="pc-fact" key={fact.value}>
              <Icon name={fact.icon} width={fact.w} height={fact.h} />
              <div>
                <p className="pc-fact-value">{fact.value}</p>
                <p className="pc-fact-label">{fact.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pc-section">
        <div className="shell">
          <h2 className="pc-h2">
            Find the right environment for the <Underline>person.</Underline>
          </h2>
          <div className="pc-service-cards">
            {services.map((service) => (
              <Link className="pc-service-card" href={service.href} key={service.href}>
                <Image
                  className="pc-photo"
                  src={service.image}
                  alt={service.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 420px"
                />
                <span className="pc-service-card-title">{service.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pc-split pc-tint">
        <div className="shell pc-split-inner">
          <OffsetPhoto
            src="/images/home/start-with-the-person-hd.webp"
            alt="A professional network meeting around a table"
            width={2800}
            height={1867}
            unoptimized
            outline="left"
            frame={{ w: 500, h: 560 }}
          />
          <div className="pc-split-text">
            <h2 className="pc-h2-display">Start with the person.</h2>
            <p className="pc-intro">
              A suitable placement depends on more than a vacancy. We bring
              assessment, practical support and professional review together.
            </p>
            <ol className="pc-numbered">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="pc-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ArrowLink href="/about">Read about our approach</ArrowLink>
          </div>
        </div>
      </section>

      <section className="pc-photo-hero pc-manifesto">
        <Image
          className="pc-photo pc-photo-hero-bg"
          src="/images/home/manifesto-team.webp"
          alt="Colleagues collaborating around a table"
          fill
          sizes="100vw"
        />
        <div className="shell pc-photo-hero-content">
          <h2 className="pc-boxed-headline">
            <span>Where every</span>
            <span>connexion counts.</span>
          </h2>
          <div className="pc-text-box">
            <p>
              Resilience, guidance, restorative practice and nurturing shape how
              we work with each person, every day.
            </p>
            <ArrowLink href="/about">Meet the people behind Pearl</ArrowLink>
          </div>
        </div>
      </section>

      <section className="pc-split pc-white">
        <div className="shell pc-split-inner reverse">
          <div className="pc-split-text">
            <h2 className="pc-h2-display">
              Skills for the <Underline>next step.</Underline>
            </h2>
            <p className="pc-intro">
              Practical support for everyday independence, learning and work.
            </p>
            <ul className="pc-icon-list">
              <li>
                <Icon name="flag" width={40} height={39} />
                <div>
                  <h3>Charting Your Path</h3>
                  <p>
                    A structured life-skills programme for care leavers and young
                    people aged 16+. Build routines, confidence, communication,
                    budgeting and safer decision-making.
                  </p>
                </div>
              </li>
              <li>
                <Icon name="suitcase" width={40} height={31} />
                <div>
                  <h3>Education and employment</h3>
                  <p>
                    Support with travel, applications, CVs, interviews and staying
                    engaged. The Levi AP partnership offers an additional route to
                    Functional Skills where appropriate.
                  </p>
                </div>
              </li>
            </ul>
            <ol className="pc-pill-steps" aria-label="Charting Your Path stages">
              {['Starting point', 'Personal goals', 'Practical work', 'Review together'].map(
                (stage, index, all) => (
                  <li key={stage}>
                    <span className="pc-pill">{stage}</span>
                    {index < all.length - 1 ? (
                      <Icon name="arrow-right-small" width={20} height={11} />
                    ) : null}
                  </li>
                ),
              )}
            </ol>
          </div>
          <OffsetPhoto
            src="/images/home/skills.webp"
            alt="A young person reading a book on a sofa"
            width={1600}
            height={1059}
            outline="right"
            frame={{ w: 460, h: 560 }}
          />
        </div>
      </section>

      <section className="pc-section">
        <div className="shell">
          <h2 className="pc-h2">How support comes together.</h2>
          <div className="pc-three-col">
            {approach.map((item) => (
              <div className="pc-col-item" key={item.title}>
                <Icon name={item.icon} width={item.w} height={item.h} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <ArrowLink href={item.href}>{item.link}</ArrowLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CqcCard />
    </main>
  );
}
