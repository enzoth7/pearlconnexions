import type { Metadata } from 'next';
import { Circled } from '@/components/pc';
import { CtaCard, TintHero } from '@/components/pc-blocks';
import {
  HeadedColumns,
  HeroActions,
  Statement,
  TintSplit,
} from '@/components/service-blocks';

export const metadata: Metadata = {
  title: 'Supported Accommodation',
  description:
    'Information about the proposed supported accommodation arrangement at Victoria Road. This is not a current placement offer.',
};

export default function SupportedAccommodationPage() {
  return (
    <main id="content">
      <TintHero
        title="Supported accommodation."
        intro="Victoria Road is being considered through an arrangement with GNK Care Services. It is not a current placement offer."
        photo={{
          src: '/images/services/sa-hero-own-room.webp',
          alt: 'A young person writing in a notebook on their bed',
          width: 1600,
          height: 1067,
          frame: { w: 480, h: 420 },
        }}
      >
        <HeroActions
          button={{ href: '/contact', label: 'Ask about future provision' }}
          link={{ href: '/supported-living', label: 'Explore supported living' }}
        />
      </TintHero>

      <Statement title="Planned carefully, before anything is offered.">
        <p>
          Supported accommodation for looked after children and care leavers aged
          16–17 has a separate Ofsted framework. The age range and service scope
          for Victoria Road have not yet been confirmed.
        </p>
        <p>
          Until then, we are happy to talk with local authorities about future
          needs and what this provision could look like.
        </p>
      </Statement>

      <HeadedColumns
        title="What needs to be in place."
        subtitle="Three things have to be settled before Victoria Road could take a referral."
        items={[
          {
            icon: 'doc',
            w: 34,
            h: 40,
            title: 'Service arrangements',
            text: 'The operating agreement, property inclusion and registered provider responsibilities must be settled.',
          },
          {
            icon: 'checklist',
            w: 40,
            h: 40,
            title: 'Admission scope',
            text: 'Age range, suitability criteria, staffing and admission readiness must be confirmed before a placement is considered.',
          },
          {
            icon: 'navigation',
            w: 40,
            h: 40,
            title: 'Individual transition',
            text: 'Any future offer would follow assessment, compatibility checks and an agreed support and transition plan.',
            link: { href: '/referrals', label: 'Read the referral process' },
          },
        ]}
      />

      <TintSplit
        photo={{
          src: '/images/services/sa-studying-hd.webp',
          alt: 'Two teenagers studying together at a table',
          width: 2400,
          height: 1600,
          unoptimized: true,
        }}
        title="Building on what we already do."
        paragraphs={[
          'Our supported living homes already help young adults with education, life skills and preparing for adulthood. Any future supported accommodation would build on the same approach.',
          'For 16 and 17 year olds, that means stability, a trusted adult and a clear plan for what comes next.',
        ]}
        link={{ href: '/supported-living', label: 'Explore supported living' }}
      />

      <CtaCard
        balancedSpacing
        title={
          <>
            Planning for a young person aged <Circled>16–17</Circled>?
          </>
        }
        text="Tell us what you are looking for. We will be clear about what we can and cannot offer today."
        button={{ href: '/contact', label: 'Ask about future provision' }}
        link={{ href: '/contact', label: 'Contact us' }}
      />
    </main>
  );
}
