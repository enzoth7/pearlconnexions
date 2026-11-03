import Link from 'next/link';
import Image from 'next/image';
import { ServicesGrid } from '@/components/services-grid';

const provisions = [
  {
    href: '/supported-living',
    title: 'Supported Living',
    image: '/services/supported-living.webp',
    alt: 'Three adults talking together at home, one in a wheelchair',
  },
  {
    href: '/supported-accommodation',
    title: 'Supported Accommodation',
    image: '/services/supported-accommodation.jpg',
    alt: 'Warm living room with a sofa and natural light',
  },
  {
    href: '/childrens-home',
    title: 'Children’s Home',
    image: '/services/childrens-home.jpg',
    alt: 'House with a garden',
  },
];

export default function Home() {
  return (
    <main id="content">
      <section className="home-hero">
        <Image
          className="hero-photo"
          src="/hero-community.webp"
          alt="Friends spending time together at an outdoor cinema"
          fill
          priority
          sizes="100vw"
          quality={85}
        />
        <div className="shell home-hero-content">
          <div className="hero-copy-block">
            <h1>
              The right setting.
              <br />
              A purposeful next step.
            </h1>
            <div className="lede">
              South London accommodation and support for young people and adults, with careful matching,
              practical life skills and progress reviewed together.
            </div>
            <div className="button-row">
              <Link className="button primary" href="/referrals">
                Discuss a placement
              </Link>
              <Link className="text-link" href="/supported-living">
                Explore supported living
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading services-heading">
          <h2>Find the right environment for the person.</h2>
        </div>
        <ServicesGrid services={provisions} />
      </section>

      <section className="section approach-section">
        <div className="shell">
          <div className="section-heading">
            <h2>Start with the person.</h2>
            <div className="section-intro homes-intro">
              A suitable placement depends on more than a vacancy. We bring
              assessment, practical support and professional review together.
            </div>
          </div>
          <div className="pillar-grid">
            <article>
              <h3>Match carefully</h3>
              <div className="pillar-copy">
                Consider wishes, communication, support needs, risk, location
                and compatibility with existing residents.
              </div>
            </article>
            <article>
              <h3>Plan useful support</h3>
              <div className="pillar-copy">
                Agree routines and goals for everyday independence, wellbeing
                and education or employment where appropriate.
              </div>
            </article>
            <article>
              <h3>Review what changes</h3>
              <div className="pillar-copy">
                Record a starting point, involve the person and their network,
                and adjust the plan when needs or risks change.
              </div>
            </article>
          </div>
          <Link className="text-link approach-link" href="/about">
            Read about our approach
          </Link>
        </div>
      </section>
    </main>
  );
}
