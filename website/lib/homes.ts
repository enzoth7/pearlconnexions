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

// The commissioner guides describe these four settings as supported living
// for adults. Availability and individual suitability are confirmed at referral.
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
    image: '/properties/crimsworth-kitchen.jpg',
    imageAlt: 'Shared kitchen at the Crimsworth setting',
  },
  {
    slug: 'coulsdon',
    name: 'Coulsdon',
    location: 'Coulsdon, South London',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Adults aged 18+',
    overview:
      'A three-bedroom shared setting for adults developing independence with support shaped around their assessed needs.',
    support: [
      'Three-bedroom shared provision',
      'Individual goals and support based on assessment',
      'A residential South London setting',
    ],
    image: '/properties/coulsdon-bedroom.jpg',
    imageAlt: 'Bedroom at the Coulsdon setting',
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
    image: '/properties/heathfields-living-room.jpg',
    imageAlt: 'Living room at the Heathfields setting',
  },
  {
    slug: 'milne-park',
    name: 'Milne Park',
    location: 'New Addington, South London',
    provision: 'supported-living',
    provisionTitle: 'Supported Living',
    provisionHref: '/supported-living',
    audience: 'Adults aged 18+',
    overview:
      'Supported living focused on preparation for adulthood and the practical skills needed for greater independence.',
    support: [
      'Everyday living, relationships and budgeting',
      'Community participation',
      'Education, employment and training goals where appropriate',
    ],
  },
];

export function homesFor(provision: ProvisionKey) {
  return homes.filter((home) => home.provision === provision);
}

export function homeBySlug(slug: string) {
  return homes.find((home) => home.slug === slug);
}
