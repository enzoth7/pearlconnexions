import type { Metadata } from 'next';
import { Underline } from '@/components/pc';
import { CtaCard, TintHero } from '@/components/pc-blocks';
import {
  HeadedColumns,
  HeroActions,
  OfstedNote,
  Statement,
  TintSplit,
} from '@/components/service-blocks';

export const metadata: Metadata = {
  title: 'Children’s Home',
  description:
    'Pearl Connexions is planning a children’s home. Opening is subject to Ofsted registration and this is not a current placement offer.',
};

export default function ChildrensHomePage() {
  return (
    <main id="content">
      <TintHero
        title="Children’s home."
        intro="Pearl Connexions is planning a children’s home. Opening is subject to Ofsted registration, so this is not a current placement offer."
        photo={{
          src: '/images/services/ch-hero-table.webp',
          alt: 'Young people playing a board game around a table',
          width: 1600,
          height: 1068,
          frame: { w: 480, h: 420 },
        }}
      >
        <HeroActions
          button={{ href: '/contact', label: 'Contact our team' }}
          link={{ href: '/referrals', label: 'Discuss a current referral' }}
        />
      </TintHero>

      <Statement title="A home that is registered before it opens.">
        <p>
          Children’s homes in England must be registered with Ofsted before they
          can care for children. Opening depends on that registration, and we
          will share updates here as it progresses.
        </p>
        <p>
          For current placement discussions, please contact us about the
          services that are available and their assessed scope.
        </p>
        <OfstedNote>Opening is subject to Ofsted registration.</OfstedNote>
      </Statement>

      <HeadedColumns
        title="Planning around the person."
        subtitle="The same principles that guide our current services will shape the children’s home."
        items={[
          {
            icon: 'heart',
            w: 40,
            h: 36,
            title: 'The child’s wishes and needs',
            text: 'Understanding each child’s wishes, needs and story, and listening to the people who know them best.',
          },
          {
            icon: 'home-c',
            w: 39,
            h: 40,
            title: 'The right environment',
            text: 'Preparing the home, routines and staff team around the child before they arrive.',
          },
          {
            icon: 'message',
            w: 40,
            h: 36,
            title: 'The professional network',
            text: 'Working closely with social workers, schools, health and family, so everyone shares one plan.',
          },
        ]}
      />

      <TintSplit
        photo={{
          src: '/images/services/ch-homework.webp',
          alt: 'An adult helping a teenager with homework',
          width: 1600,
          height: 1067,
        }}
        title="Quality from day one."
        paragraphs={[
          'Our quality framework for the children’s home is already written. Each month the home completes an audit, a coordinator reviews it, and leadership agrees actions that are followed up.',
          'We will share more about the home, its team and its opening as registration progresses.',
        ]}
        link={{ href: '/about/who-we-are', label: 'How we hold ourselves to account' }}
      />

      <CtaCard
        balancedSpacing
        title={
          <>
            Looking for a placement <Underline>now</Underline>?
          </>
        }
        text="While the children’s home is being planned, we can talk about our current services and whether they fit."
        button={{ href: '/contact', label: 'Contact our team' }}
        link={{ href: '/referrals', label: 'Discuss a current referral' }}
      />
    </main>
  );
}
