export type ProvisionKey =
  | 'supported-living'
  | 'supported-accommodation'
  | 'childrens-home';

export type Home = {
  slug: string;
  name: string;
  location: string;
  provision: ProvisionKey;
  provisionTitle: string;
  provisionHref: string;
  audience: string;
  overview: string;
  support: string[];
  image?: string;
  imageAlt?: string;
};

const supportedLivingOverview =
  'A safe, welcoming home with personalised support designed to help women build confidence and greater independence.';

const supportedLivingSupport = [
  'Female-only provision for adults aged 18+',
  'Personalised, strengths-based support',
  'A clear focus on confidence and independence',
];

const supportedAccommodationOverview =
  'Stable accommodation with practical support for young people as they prepare for adulthood and their next chapter.';

const supportedAccommodationSupport = [
  'Provision for young people aged 16–17',
  'Practical preparation for adulthood',
  'Support shaped around individual goals',
];

export const homes: Home[] = [
  {
    slug: 'coulsdon',
    name: 'Coulsdon',
    location: 'Coulsdon, South London',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Women aged 18+',
    overview: supportedLivingOverview,
    support: supportedLivingSupport,
    image: '/properties/coulsdon-bedroom.jpg',
    imageAlt: 'Bright private bedroom at the Coulsdon home',
  },
  {
    slug: 'heathfields',
    name: 'Heathfields',
    location: 'Location to be confirmed',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Women aged 18+',
    overview: supportedLivingOverview,
    support: supportedLivingSupport,
    image: '/properties/heathfields-living-room.jpg',
    imageAlt: 'Comfortable living room at the Heathfields home',
  },
  {
    slug: 'crimsworth',
    name: 'Crimsworth',
    location: 'Location to be confirmed',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Women aged 18+',
    overview: supportedLivingOverview,
    support: supportedLivingSupport,
    image: '/properties/crimsworth-kitchen.jpg',
    imageAlt: 'Modern shared kitchen at the Crimsworth home',
  },
  {
    slug: 'friday-road',
    name: 'Friday Road',
    location: 'Location to be confirmed',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Women aged 18+',
    overview: supportedLivingOverview,
    support: supportedLivingSupport,
    image: '/properties/friday-road-garden.jpg',
    imageAlt: 'Private garden at the Friday Road home',
  },
  {
    slug: 'victoria-road',
    name: 'Victoria Road',
    location: 'Location to be confirmed',
    provision: 'supported-accommodation',
    provisionTitle: 'Supported Accommodation',
    provisionHref: '/supported-accommodation',
    audience: 'Young people aged 16–17',
    overview: supportedAccommodationOverview,
    support: supportedAccommodationSupport,
  },
  {
    slug: 'milne-park',
    name: 'Milne Park',
    location: 'Location to be confirmed',
    provision: 'supported-accommodation',
    provisionTitle: 'Supported Accommodation',
    provisionHref: '/supported-accommodation',
    audience: 'Young people aged 16–17',
    overview: supportedAccommodationOverview,
    support: supportedAccommodationSupport,
  },
  {
    slug: 'brambles-acre',
    name: 'Brambles Acre',
    location: 'Location shared during the referral process',
    provision: 'childrens-home',
    provisionTitle: 'Children’s Home',
    provisionHref: '/childrens-home',
    audience: 'Children and young people',
    overview:
      'A nurturing residential home shaped around safety, trusted relationships and individual progress.',
    support: [
      'A safe and nurturing home environment',
      'Support built through trusted relationships',
      'Care shaped around individual progress',
    ],
  },
];

export function homesFor(provision: ProvisionKey) {
  return homes.filter((home) => home.provision === provision);
}

export function homeBySlug(slug: string) {
  return homes.find((home) => home.slug === slug);
}
