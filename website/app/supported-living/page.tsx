import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLink, CqcCard, Icon, Underline } from '@/components/pc';
import { TintHero } from '@/components/pc-blocks';
import {
  HeadedColumns,
  HeroActions,
  IconGrid,
  Statement,
  TintSplit,
} from '@/components/service-blocks';
import { homes } from '@/lib/homes';

export const metadata: Metadata = {
  title: 'Supported Living',
  description:
    'Supported living for adults aged 18+ across four South London homes, with support planned around the person.',
};

const support = [
  { icon: 'message', w: 40, h: 36, title: 'Keyworker support', text: 'A named keyworker who knows the person, meets with them regularly and keeps the plan on track.' },
  { icon: 'cutlery', w: 20, h: 40, title: 'Everyday living skills', text: 'Cooking, cleaning, laundry and shopping, practised together until they become routine.' },
  { icon: 'piggybank', w: 40, h: 36, title: 'Money and bills', text: 'Budgeting, benefits and paying bills, with as much or as little help as the person needs.' },
  { icon: 'heartbeat', w: 40, h: 36, title: 'Health and wellbeing', text: 'Support with appointments, medication and routines that protect physical and mental health.' },
  { icon: 'suitcase-c', w: 40, h: 32, title: 'Education, training and work', text: 'Help with college, courses, CVs, applications and interviews, at a pace that works.' },
  { icon: 'bus', w: 39, h: 40, title: 'Out in the community', text: 'Getting around London, using local services and building connections outside the home.' },
];

export default function SupportedLivingPage() {
  return (
    <main id="content">
      <TintHero
        title="Supported living."
        intro="Supported living for adults aged 18+ across four South London homes. We consider the person, the home and the people already living there before confirming a placement."
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
          link={{ href: '#homes', label: 'See our homes' }}
        />
      </TintHero>

      <Statement title="Your own space, with support close by.">
        <p>
          Each person has their own room in a shared home. Staff are on hand to
          support daily routines, health, money and the practical skills that
          lead to more independence.
        </p>
        <p>
          Supported living can suit adults with learning disabilities, autism,
          mental health or complex support needs, and care leavers preparing for
          adulthood.
        </p>
      </Statement>

      <IconGrid
        title={
          <>
            What <Underline>support</Underline> looks like.
          </>
        }
        items={support}
      />

      <section className="pc-homes" id="homes">
        <div className="shell">
          <h2 className="pc-h2">Four homes across South London.</h2>
          <p className="pc-team-intro">
            Each home has a different feel and suits different people.
            Availability and fit are confirmed through assessment and a placement
            discussion.
          </p>
          <div className="pc-home-cards">
            {homes.map((home) => (
              <article className="pc-home-card" key={home.slug}>
                <Link
                  className="pc-home-card-media"
                  href={`/homes/${home.slug}`}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {home.image ? (
                    <Image
                      className="pc-photo"
                      src={home.image}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 100vw, 570px"
                    />
                  ) : (
                    <span className="pc-photo-placeholder">
                      <Icon name="home-navy" width={47} height={48} />
                      Photos coming soon
                    </span>
                  )}
                </Link>
                <h3>{home.name}</h3>
                <p className="pc-home-location">
                  <Icon name="location-navy-11" width={11} height={18} />
                  {home.location}
                </p>
                <ArrowLink href={`/homes/${home.slug}`}>View {home.name}</ArrowLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TintSplit
        photo={{
          src: '/images/services/sl-community-shopping.webp',
          alt: 'A young man smiling in a supermarket aisle',
          width: 933,
          height: 1400,
        }}
        title="Life beyond the front door."
        paragraphs={[
          'Each home is close to transport, shops, health services and colleges. We help people use them with growing confidence, from a first bus journey to booking their own appointments.',
          'The aim is a life connected to the local area, not one centred on the house.',
        ]}
        link={{ href: '/about', label: 'How we support progress' }}
      />

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

      <CqcCard />
    </main>
  );
}
