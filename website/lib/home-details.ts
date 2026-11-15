// Booking-style detail for each supported living home.
// Facilities marked in the notes below are placeholders until Joel confirms them.
// Photos are Pearl's own (November 2026 folders and house guides). A home with
// fewer than five photos shows placeholders in the remaining gallery slots.

export type IconRef = { name: string; ratio: number };

const ICON: Record<string, IconRef> = {
  home: { name: 'home-c', ratio: 158 / 160 },
  water: { name: 'water', ratio: 112 / 158 },
  user: { name: 'user-c', ratio: 154 / 139 },
  heart: { name: 'heart', ratio: 44 / 40 },
  tree: { name: 'tree', ratio: 44 / 39 },
  piggy: { name: 'piggybank', ratio: 179 / 162 },
  key: { name: 'key', ratio: 149 / 140 },
  cutlery: { name: 'cutlery', ratio: 77 / 157 },
  sofa: { name: 'sofa', ratio: 158 / 144 },
  signal: { name: 'signal', ratio: 162 / 125 },
  shield: { name: 'shield-44', ratio: 1 },
  bus: { name: 'bus', ratio: 151 / 154 },
  cart: { name: 'cart', ratio: 145 / 140 },
  steth: { name: 'stethoscope', ratio: 130 / 153 },
  bulb: { name: 'bulb', ratio: 116 / 160 },
};

export type Photo = { src: string; alt: string; illustrative: boolean };

export type HomeDetail = {
  area: string;
  /** Photo used on home cards (Our homes, Other homes). Defaults to the first gallery photo. */
  card?: Photo;
  gallery: Photo[];
  facts: { icon: IconRef; title: string; text: string }[];
  offers: { icon: IconRef; label: string }[];
  living: { title: string; text: string }[];
  mapCenter: { lat: number; lon: number };
  nearby: { icon: IconRef; title: string; text: string }[];
};

const nearbyCommon = (transport: string, shops = 'Local shops and supermarkets nearby.', health = 'GP surgeries and pharmacies in the area.', education = 'Colleges, training and job support within reach.') => [
  { icon: ICON.bus, title: 'Transport', text: transport },
  { icon: ICON.cart, title: 'Shops', text: shops },
  { icon: ICON.steth, title: 'Health', text: health },
  { icon: ICON.bulb, title: 'Education and work', text: education },
];

const supportedLivingFact = { icon: ICON.heart, title: 'Supported living', text: 'CQC registered service' };

export const homeDetails: Record<string, HomeDetail> = {
  crimsworth: {
    area: 'Vauxhall',
    gallery: [
      { src: '/images/homes/card-sapphire.webp', alt: 'Street and front garden of Sapphire House', illustrative: false },
      { src: '/images/homes/sapphire-bedroom.webp', alt: 'A bedroom at Sapphire House', illustrative: false },
      { src: '/images/homes/sapphire-bathroom.webp', alt: 'Bathroom with a bath at Sapphire House', illustrative: false },
      { src: '/images/homes/sapphire-living.webp', alt: 'Living room at Sapphire House', illustrative: false },
      { src: '/images/homes/sapphire-kitchen.webp', alt: 'Kitchen at Sapphire House', illustrative: false },
    ],
    facts: [
      { icon: ICON.home, title: '3 bedrooms', text: 'Shared setting' },
      { icon: ICON.water, title: '2 bathrooms', text: 'Shared' },
      { icon: ICON.user, title: 'Men', text: 'Aged 18+' },
      supportedLivingFact,
    ],
    offers: [
      { icon: ICON.key, label: 'Your own bedroom' },
      { icon: ICON.cutlery, label: 'Shared kitchen' },
      { icon: ICON.water, label: 'Two shared bathrooms' },
      { icon: ICON.sofa, label: 'Shared living room' },
      { icon: ICON.signal, label: 'Wi-Fi' },
      { icon: ICON.tree, label: 'Outdoor space' },
      { icon: ICON.user, label: 'Keyworker support' },
      { icon: ICON.shield, label: 'Support planned around you' },
    ],
    living: [
      { title: 'The home', text: 'Three bedrooms in a shared supported living setting, with two shared bathrooms.' },
      { title: 'Life in Vauxhall', text: 'Excellent transport connections and access to community, education and employment opportunities.' },
      { title: 'Support for independence', text: 'Support is shaped around assessed needs and personal goals, with planned reviews as independence develops.' },
    ],
    mapCenter: { lat: 51.487, lon: -0.123 },
    nearby: nearbyCommon('Vauxhall station: Underground, rail and buses.'),
  },
  coulsdon: {
    area: 'Coulsdon',
    gallery: [
      { src: '/images/homes/card-garnet.webp', alt: 'Open-plan kitchen and living area at Garnet House', illustrative: false },
      { src: '/images/homes/garnet-bedroom.webp', alt: 'A bedroom at Garnet House', illustrative: false },
      { src: '/images/homes/garnet-bathroom.webp', alt: 'Shower room at Garnet House', illustrative: false },
      { src: '/images/homes/homes-hero-lounge.webp', alt: 'Lounge at Garnet House', illustrative: false },
      { src: '/images/homes/garnet-high-street.webp', alt: 'Shops and a bus stop on Coulsdon high street', illustrative: false },
    ],
    facts: [
      { icon: ICON.home, title: '3 bedrooms', text: 'Shared setting' },
      { icon: ICON.tree, title: 'Residential area', text: 'South London' },
      { icon: ICON.user, title: 'Adults', text: 'Aged 18+' },
      supportedLivingFact,
    ],
    offers: [
      { icon: ICON.key, label: 'Your own bedroom' },
      { icon: ICON.cutlery, label: 'Shared kitchen' },
      { icon: ICON.water, label: 'Shared bathrooms' },
      { icon: ICON.sofa, label: 'Shared living room' },
      { icon: ICON.signal, label: 'Wi-Fi' },
      { icon: ICON.tree, label: 'Outdoor space' },
      { icon: ICON.user, label: 'Keyworker support' },
      { icon: ICON.shield, label: 'Support planned around you' },
    ],
    living: [
      { title: 'The home', text: 'A three-bedroom shared supported living provision in a residential South London setting.' },
      { title: 'A supported next step', text: 'For adults developing independence while continuing to benefit from planned support.' },
      { title: 'A plan built around the person', text: 'Individual needs and goals shape the support, with progress reviewed together.' },
    ],
    mapCenter: { lat: 51.32, lon: -0.139 },
    nearby: nearbyCommon('Coulsdon Town and Coulsdon South stations, plus local buses.'),
  },
  heathfields: {
    area: 'South Croydon',
    gallery: [
      { src: '/images/homes/card-ruby.webp', alt: 'Living room with a bay window at Ruby House', illustrative: false },
      { src: '/images/homes/ruby-bedroom.webp', alt: 'A bedroom at Ruby House', illustrative: false },
      { src: '/images/homes/ruby-garden.webp', alt: 'Garden at Ruby House', illustrative: false },
      { src: '/images/homes/ruby-kitchen.webp', alt: 'Kitchen at Ruby House', illustrative: false },
      { src: '/images/homes/ruby-front.webp', alt: 'Front of Ruby House', illustrative: false },
    ],
    facts: [
      { icon: ICON.user, title: 'Female-only', text: 'Women aged 18+' },
      { icon: ICON.water, title: 'Allocated bathrooms', text: 'Personal space' },
      { icon: ICON.tree, title: 'Quieter setting', text: 'Residential area' },
      supportedLivingFact,
    ],
    offers: [
      { icon: ICON.key, label: 'Your own bedroom' },
      { icon: ICON.water, label: 'Allocated bathroom' },
      { icon: ICON.cutlery, label: 'Fully equipped kitchen' },
      { icon: ICON.sofa, label: 'Shared living room' },
      { icon: ICON.user, label: 'Female-only home' },
      { icon: ICON.cutlery, label: 'Dining space' },
      { icon: ICON.tree, label: 'Outdoor garden' },
      { icon: ICON.shield, label: 'Support planned around you' },
    ],
    living: [
      { title: 'Personal space', text: 'A female-only environment with allocated bathroom arrangements.' },
      { title: 'A quieter setting', text: 'A residential location in Heathfields, South Croydon, for women who value privacy and a quieter environment.' },
      { title: 'The right fit', text: 'Preferences, personal space and support needs guide matching and the individual support plan.' },
    ],
    mapCenter: { lat: 51.363, lon: -0.093 },
    nearby: nearbyCommon(
      'Tramlink and South Croydon station nearby.',
      'Shopping centres and Tesco nearby.',
      'Croydon University Hospital and NHS GP surgeries.',
      'Croydon College and local training within reach.',
    ),
  },
  'milne-park': {
    area: 'New Addington',
    gallery: [
      { src: '/images/homes/card-emerald.webp', alt: 'Front of Emerald House', illustrative: false },
      { src: '/images/homes/emerald-bedroom.webp', alt: 'A bedroom at Emerald House', illustrative: false },
      { src: '/images/homes/emerald-kitchen.webp', alt: 'Kitchen at Emerald House', illustrative: false },
      { src: '/images/homes/emerald-lounge.webp', alt: 'Lounge at Emerald House', illustrative: false },
      { src: '/images/homes/emerald-garden.webp', alt: 'Garden at Emerald House', illustrative: false },
    ],
    facts: [
      { icon: ICON.home, title: 'Shared setting', text: 'Own bedroom' },
      { icon: ICON.piggy, title: 'Life skills', text: 'Budgeting and money' },
      { icon: ICON.user, title: 'Adults', text: 'Aged 18+' },
      supportedLivingFact,
    ],
    offers: [
      { icon: ICON.key, label: 'Your own bedroom' },
      { icon: ICON.cutlery, label: 'Shared kitchen' },
      { icon: ICON.sofa, label: 'Shared living room' },
      { icon: ICON.signal, label: 'Wi-Fi' },
      { icon: ICON.tree, label: 'Outdoor space' },
      { icon: ICON.user, label: 'Keyworker support' },
      { icon: ICON.piggy, label: 'Budgeting support' },
      { icon: ICON.shield, label: 'Support planned around you' },
    ],
    living: [
      { title: 'Everyday independence', text: 'Practical life skills, managing money and building relationships are central to the support.' },
      { title: 'Community and opportunity', text: 'Support with community participation, education, employment and training goals.' },
      { title: 'Preparing for the next step', text: 'Goals are agreed with the person and reviewed as their confidence and independence develop.' },
    ],
    mapCenter: { lat: 51.343, lon: -0.016 },
    nearby: nearbyCommon('New Addington tram stop and local buses.'),
  },
  'friday-road': {
    area: 'Mitcham',
    gallery: [
      { src: '/images/homes/onyx-living.webp', alt: 'Living room at Onyx House', illustrative: false },
      { src: '/images/homes/onyx-bedroom.webp', alt: 'A bedroom at Onyx House', illustrative: false },
      { src: '/images/homes/onyx-bathroom.webp', alt: 'Bathroom with a bath at Onyx House', illustrative: false },
      { src: '/images/homes/onyx-kitchen.webp', alt: 'Kitchen and dining table at Onyx House', illustrative: false },
      { src: '/images/homes/onyx-front.webp', alt: 'Front of Onyx House', illustrative: false },
    ],
    facts: [
      { icon: ICON.user, title: 'Female-only', text: 'Women aged 18+' },
      { icon: ICON.water, title: 'Own bedroom', text: 'Personal space' },
      { icon: ICON.tree, title: 'Good transport links', text: 'Residential area' },
      supportedLivingFact,
    ],
    offers: [
      { icon: ICON.key, label: 'Your own bedroom' },
      { icon: ICON.water, label: 'Bathroom with bath' },
      { icon: ICON.cutlery, label: 'Fully equipped kitchen' },
      { icon: ICON.sofa, label: 'Shared living room' },
      { icon: ICON.user, label: 'Female-only home' },
      { icon: ICON.cutlery, label: 'Dining space' },
      { icon: ICON.tree, label: 'Outdoor garden' },
      { icon: ICON.shield, label: 'Support planned around you' },
    ],
    living: [
      { title: 'Personal space', text: 'A female-only home with private bedrooms and a shared living room, kitchen and dining space.' },
      { title: 'Connected to the area', text: 'A residential street in Mitcham, with buses to Tooting, Croydon and Sutton and Morden Hall Park nearby.' },
      { title: 'The right fit', text: 'Preferences, personal space and support needs guide matching and the individual support plan.' },
    ],
    mapCenter: { lat: 51.414, lon: -0.157 },
    nearby: nearbyCommon(
      'Buses from London Road and Gorringe Park Avenue; Tooting station about 10–15 minutes’ walk.',
      'Tesco, Sainsbury’s, Lidl and Aldi, plus Morden Hall Park nearby.',
      'Local GP surgeries and pharmacies within walking distance.',
      'Jobcentre Plus Mitcham, Merton’s employment service and local libraries.',
    ),
  },
};

/** Card photo for "Our homes" and "Other homes". */
export function cardPhoto(slug: string) {
  const detail = homeDetails[slug];
  return detail?.card ?? detail?.gallery[0];
}
