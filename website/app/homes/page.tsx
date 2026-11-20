import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLink, Icon } from '@/components/pc';
import { TintHero } from '@/components/pc-blocks';
import { HeadedColumns, HeroActions } from '@/components/service-blocks';
import { homes, provisionLabel } from '@/lib/homes';
import { cardPhoto, homeDetails } from '@/lib/home-details';

export const metadata: Metadata = {
  title: 'Our homes',
  description:
    'Five supported living homes across South London. Explore each home, then speak to Pearl Connexions about availability and suitability.',
};

export default function OurHomesPage() {
  return (
    <main id="content">
      <TintHero
        title="Our homes."
        intro="Five supported living homes across South London, each with its own feel. Explore the homes, then speak to us about current availability and suitability."
        photo={{
          src: '/images/homes/homes-hero-lounge.webp',
          alt: 'Living room with sofas and armchairs at Garnet House',
          width: 1228,
          height: 820,
          frame: { w: 480, h: 420 },
        }}
      >
        <HeroActions
          button={{ href: '/referrals', label: 'Discuss a referral' }}
          link={{ href: '/faqs', label: 'Read our FAQs' }}
        />
      </TintHero>

      <section className="pc-homes" id="homes">
        <div className="shell">
          <h2 className="pc-h2">Find a home that feels right.</h2>
          <p className="pc-team-intro">
            Each home has a different feel and suits different people.
            Availability and fit are confirmed through assessment and a placement
            discussion.
          </p>
          <div className="pc-home-cards pc-home-cards-3">
            {homes.map((home) => {
              const photo = cardPhoto(home.slug);
              const area = homeDetails[home.slug]?.area ?? home.location;
              return (
                <article className="pc-home-card" key={home.slug}>
                  <div className="pc-home-tag">{provisionLabel(home)}</div>
                  <Link
                    className="pc-home-card-media"
                    href={`/homes/${home.slug}`}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    {photo ? (
                      <Image
                        className="pc-photo"
                        src={photo.src}
                        alt=""
                        fill
                        sizes="(max-width: 900px) 100vw, 370px"
                      />
                    ) : (
                      <div className="pc-photo-placeholder">
                        <Icon name="home-navy" width={47} height={48} />
                        Photos coming soon
                      </div>
                    )}
                  </Link>
                  <h3>{home.name}</h3>
                  <div className="pc-home-location">
                    <Icon name="location-navy-11" width={11} height={18} />
                    {area}, {home.audience}
                  </div>
                  <ArrowLink href={`/homes/${home.slug}`}>View home and enquire</ArrowLink>
                </article>
              );
            })}
          </div>
          <div className="pc-homes-note">
            Availability is confirmed with the team at the time of enquiry. The
            exact address is shared during the referral process.
          </div>
        </div>
      </section>

      <HeadedColumns
        title="How a placement comes together."
        subtitle="From the first conversation to regular reviews, the person and their professionals stay involved."
        items={[
          {
            icon: 'fileform',
            w: 33,
            h: 40,
            title: 'Referral and assessment',
            text: 'Share an anonymised profile. We look at needs, risks and goals, and meet the person where possible.',
            link: { href: '/referrals', label: 'Read the referral process' },
          },
          {
            icon: 'puzzle',
            w: 40,
            h: 36,
            title: 'Matching and moving in',
            text: 'We consider the home, the area and the people already living there, then plan a gradual move with the person.',
          },
          {
            icon: 'calendar',
            w: 40,
            h: 38,
            title: 'Reviewed together',
            text: 'Goals are reviewed regularly with the person and their professionals, and the plan changes as they progress.',
            link: { href: '/contact', label: 'Contact us' },
          },
        ]}
      />
    </main>
  );
}
