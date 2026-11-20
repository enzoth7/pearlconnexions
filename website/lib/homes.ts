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
};

// The commissioner guides describe these five settings as supported living
// for adults. Availability and individual suitability are confirmed at referral.
// Each home has a name (Sapphire House) and a location (street or neighbourhood).
// Slugs follow the location; the name is what people see.
export const homes: Home[] = [
  {
    slug: 'crimsworth',
    name: 'Sapphire House',
    location: 'Crimsworth, Vauxhall',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Men aged 18+',
    overview:
      'A three-bedroom shared setting in Vauxhall for adults who may benefit from access to transport, community, education and employment opportunities.',
    support: [
      'Three bedrooms and two shared bathrooms',
      'Support planned around assessed needs and independence goals',
      'Access to community, education and employment opportunities',
    ],
  },
  {
    slug: 'coulsdon',
    name: 'Garnet House',
    location: 'Coulsdon, South London',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Adults aged 18+, mixed',
    overview:
      'A three-bedroom shared setting for adults developing independence with support shaped around their assessed needs.',
    support: [
      'Three-bedroom shared provision',
      'Individual goals and support based on assessment',
      'A residential South London setting',
    ],
  },
  {
    slug: 'heathfields',
    name: 'Ruby House',
    location: 'Heathfields, South Croydon',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Women aged 18+',
    overview:
      'A female-only setting for women whose preferences and needs include personal space and a quieter residential environment.',
    support: [
      'Female-only supported living',
      'Allocated bathroom arrangements',
      'Support planned around privacy, wellbeing and independence',
    ],
  },
  {
    slug: 'milne-park',
    name: 'Emerald House',
    location: 'New Addington, South London',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Adults aged 18+, mixed',
    overview:
      'Supported living focused on preparation for adulthood and the practical skills needed for greater independence.',
    support: [
      'Everyday living, relationships and budgeting',
      'Community participation',
      'Education, employment and training goals where appropriate',
    ],
  },
  {
    slug: 'friday-road',
    name: 'Onyx House',
    location: 'Mitcham, Merton',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Women aged 18+',
    overview:
      'A female-only home in Mitcham for women who want their own space, a calm shared home and good links to Tooting and Croydon.',
    support: [
      'Female-only supported living',
      'Own bedroom and a bathroom with bath',
      'Support planned around privacy, wellbeing and independence',
    ],
  },
];

/** Sentence-case label for the type of home, e.g. "Supported living". */
export function provisionLabel(home: Home) {
  const title = home.provisionTitle;
  return title.charAt(0) + title.slice(1).toLowerCase();
}

export function homesFor(provision: ProvisionKey) {
  return homes.filter((home) => home.provision === provision);
}

export function homeBySlug(slug: string) {
  return homes.find((home) => home.slug === slug);
}
