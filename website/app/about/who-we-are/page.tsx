import type { Metadata } from 'next';
import { ArrowLink, Icon, OffsetPhoto, Underline } from '@/components/pc';
import { CtaCard, RuledColumns, TintHero } from '@/components/pc-blocks';

export const metadata: Metadata = {
  title: 'Who we are',
  description:
    'Pearl Connexions is a Community Interest Company in South London providing supported living with practical, consistent support.',
};

const facts = [
  { icon: 'doc', w: 41, h: 48, value: '2021', label: 'set up as a Community Interest Company' },
  { icon: 'location-celeste', w: 29, h: 48, value: 'South London', label: 'based in Tooting, with homes from Vauxhall to New Addington' },
  { icon: 'shield-44', w: 48, h: 48, value: 'CQC', label: 'registered for personal care' },
];

const values = [
  { icon: 'shield-44', w: 44, h: 44, title: 'Resilience', text: 'Helping people cope with setbacks and keep working towards their goals.' },
  { icon: 'heart', w: 44, h: 40, title: 'Self-care', text: 'Building routines for health, rest and wellbeing that the person can keep up.' },
  { icon: 'navigation', w: 44, h: 44, title: 'Guidance', text: 'Clear information and consistent boundaries, so people can make informed choices.' },
  { icon: 'folded-hands', w: 39, h: 44, title: 'Restorative', text: 'When things go wrong, we talk it through and work to repair relationships.' },
  { icon: 'tree', w: 44, h: 39, title: 'Nurturing', text: 'Warm, consistent relationships that give confidence room to grow.' },
  { icon: 'hand', w: 35, h: 44, title: 'Healing', text: 'Trauma-informed support that recognises what people have been through.' },
];

const locations = [
  ['Office', '24 Totterdown Street, Tooting SW17'],
  ['Sapphire House', 'Vauxhall'],
  ['Coulsdon', 'South London'],
  ['Ruby House', 'South Croydon'],
  ['Milne Park', 'New Addington'],
];

const companiesHouse =
  'https://find-and-update.company-information.service.gov.uk/company/13294525';

export default function WhoWeArePage() {
  return (
    <main id="content">
      <TintHero
        marks
        title="Who we are."
        intro="Pearl Connexions is a Community Interest Company based in South London. We provide supported living with practical, consistent support that helps people build a settled and more independent life."
        photo={{
          src: '/images/who-we-are/hero-friends.webp',
          alt: 'Three friends laughing together at home',
          width: 1600,
          height: 1066,
          frame: { w: 480, h: 420 },
        }}
      />

      <section className="pc-statement">
        <div className="shell pc-statement-inner">
          <h2>A stable home and the right support can change what happens next.</h2>
          <div className="pc-statement-copy">
            <p>
              We support adults with learning disabilities, autism, mental health
              or complex support needs, as well as care leavers preparing for
              adulthood.
            </p>
            <p>
              Our job is to get the basics right: a safe and settled home, people
              who stay consistent, and goals that belong to the person, reviewed
              together as things change.
            </p>
            <p className="pc-caveat">Where every connexion counts</p>
          </div>
        </div>
      </section>

      <section className="pc-facts-band pc-facts-compact" aria-label="Key facts">
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

      <section className="pc-values">
        <div className="shell">
          <h2 className="pc-h2-display">
            Our <Underline>values.</Underline>
          </h2>
          <div className="pc-values-grid">
            {values.map((value) => (
              <div className="pc-value" key={value.title}>
                <div className="pc-icon-slot pc-icon-slot-44">
                  <Icon name={value.icon} width={value.w} height={value.h} />
                </div>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pc-split pc-tint">
        <div className="shell pc-split-inner pc-gap-80">
          <OffsetPhoto
            src="/images/who-we-are/cic-park-sharp.webp"
            alt="Three young people studying on the grass in a park"
            width={2200}
            height={2200}
            outline="left"
            frame={{ w: 460, h: 460 }}
          />
          <div className="pc-split-text pc-stack-20">
            <h2 className="pc-h2-display">A Community Interest Company.</h2>
            <p className="pc-body-18">
              Pearl Connexions (PC) CIC is registered with Companies House as a
              Community Interest Company. CICs are social enterprises set up to
              benefit the community, and an asset lock means their assets are
              used for that purpose.
            </p>
            <p className="pc-body-18">
              For the people we support, it means our attention stays on the
              quality of their home and the support around them.
            </p>
            <ArrowLink href={companiesHouse} external>
              View our Companies House record
            </ArrowLink>
          </div>
        </div>
      </section>

      <section className="pc-split pc-white">
        <div className="shell pc-split-inner reverse">
          <div className="pc-split-text">
            <h2 className="pc-h2-display">Based in Tooting. Working across South London.</h2>
            <p className="pc-body-18 pc-mt-20">
              Our office is in Tooting, and our supported living homes sit in
              neighbourhoods with transport, services and community close by.
            </p>
            <ul className="pc-locations">
              {locations.map(([name, place]) => (
                <li key={name}>
                  <Icon name="location-celeste" width={13} height={22} />
                  <strong>{name}</strong>
                  <span>{place}</span>
                </li>
              ))}
            </ul>
            <ArrowLink href="/supported-living">Explore supported living</ArrowLink>
          </div>
          <OffsetPhoto
            src="/images/who-we-are/tooting-broadway.webp"
            alt="Tooting Broadway Underground station"
            width={1600}
            height={1200}
            outline="right"
            frame={{ w: 500, h: 420 }}
          />
        </div>
      </section>

      <section className="pc-account">
        <div className="shell">
          <RuledColumns
            items={[
              {
                icon: 'tick',
                w: 34,
                h: 23,
                title: 'Registered with CQC',
                text: 'Our supported living service is registered with the Care Quality Commission for personal care.',
                link: {
                  href: 'https://www.cqc.org.uk/location/1-19314630787',
                  label: 'View our CQC registration',
                  external: true,
                },
              },
              {
                icon: 'checklist',
                w: 40,
                h: 40,
                title: 'Quality checked every month',
                text: 'Our quality framework sets a monthly cycle: each home completes an audit, a coordinator reviews it, and leadership agree actions that are followed up the next month.',
              },
              {
                icon: 'doc',
                w: 34,
                h: 40,
                title: 'Open about who we are',
                text: 'Our company record, officers and filed accounts are public on Companies House.',
                link: { href: companiesHouse, label: 'View on Companies House', external: true },
              },
            ]}
          />
        </div>
      </section>

      <CtaCard
        title="Talk to us about a placement."
        text="Share an anonymised profile and we will discuss fit, current capacity and next steps."
        button={{ href: '/referrals', label: 'Make a referral' }}
        link={{ href: '/contact', label: 'Contact us' }}
      />
    </main>
  );
}
