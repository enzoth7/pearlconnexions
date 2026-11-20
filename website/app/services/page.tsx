import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLink, CqcCard, Underline } from '@/components/pc';
import { TintHero } from '@/components/pc-blocks';
import { HeroActions, IconGrid } from '@/components/service-blocks';
import WhoWeSupport from '@/components/WhoWeSupport';
import WorkforceSection from '@/components/WorkforceSection';
import { supportItems } from '@/lib/support-items';

export const metadata: Metadata = {
  title: 'Our Services',
  description:
    'Homes and personalised support for people who need stability and a clear pathway towards independence: supported living, supported accommodation and a planned children’s home.',
};

const services = [
  {
    href: '/supported-living',
    title: 'Supported Living',
    image: '/images/home/card-supported-living-sofa.webp',
    alt: 'Two young adults laughing together on a sofa at home, one in a wheelchair',
    text: 'Adults aged 18+ across five South London homes. Provided by Pearl Connexions (PC) CIC.',
    link: 'Explore supported living',
  },
  {
    href: '/supported-accommodation',
    title: 'Supported Accommodation',
    image: '/images/home/card-supported-accommodation-unpacking.webp',
    alt: 'Young man unpacking boxes in his new room',
    text: 'A supported step towards independence for young people, at Victoria Road. Provided through GNK Care Services. Not a current placement offer.',
    link: 'Read the information',
  },
  {
    href: '/childrens-home',
    title: 'Children’s Home',
    image: '/images/home/card-childrens-home-brick-house.webp',
    alt: 'Red brick family house with a hedge and lawn',
    text: 'Planned by Pearl Connexions, with opening subject to Ofsted registration. Not a current placement offer.',
    link: 'See our plans',
  },
];

export default function ServicesPage() {
  return (
    <main id="content">
      <TintHero
        title="Our services."
        intro="Homes and personalised support for people who need stability and a clear pathway towards independence. Every service starts with the person and the people around them."
        photo={{
          src: '/images/services/sl-hero-friends.webp',
          alt: 'Three friends walking and talking in the city',
          width: 1600,
          height: 1067,
          frame: { w: 480, h: 420 },
        }}
      >
        <HeroActions
          button={{ href: '/referrals', label: 'Discuss a referral' }}
          link={{ href: '#services', label: 'Compare our services' }}
        />
      </TintHero>

      <WhoWeSupport />

      <section className="pc-homes" id="services">
        <div className="shell">
          <h2 className="pc-h2">
            Find the right environment for the <Underline>person.</Underline>
          </h2>
          <p className="pc-team-intro">
            Each service has a different purpose and a different stage of
            availability. Suitability is confirmed through assessment and a
            placement discussion.
          </p>
          <div className="pc-home-cards pc-home-cards-3">
            {services.map((service) => (
              <article className="pc-home-card" key={service.href}>
                <Link
                  className="pc-home-card-media"
                  href={service.href}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <Image
                    className="pc-photo"
                    src={service.image}
                    alt={service.alt}
                    fill
                    sizes="(max-width: 900px) 100vw, 370px"
                  />
                </Link>
                <h3>{service.title}</h3>
                <p className="pc-home-card-text">{service.text}</p>
                <ArrowLink href={service.href}>{service.link}</ArrowLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <IconGrid
        title={
          <>
            What <Underline>support</Underline> looks like.
          </>
        }
        items={supportItems}
      />

      <WorkforceSection />

      <CqcCard />
    </main>
  );
}
