// Booking-style detail for each supported living home.
// Facilities marked in the notes below are placeholders until Joel confirms them.
// Photos other than the main Pearl photograph are illustrative (Pexels).

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
      { src: '/properties/crimsworth-kitchen.jpg', alt: 'Shared kitchen at Sapphire House', illustrative: false },
      { src: '/images/homes/sapphire-bedroom.webp', alt: 'A bedroom (illustrative)', illustrative: true },
      { src: '/images/homes/sapphire-bathroom.webp', alt: 'A bathroom (illustrative)', illustrative: true },
      { src: '/images/homes/sapphire-living.webp', alt: 'A living room (illustrative)', illustrative: true },
      { src: '/images/homes/sapphire-street.webp', alt: 'A London residential street (illustrative)', illustrative: true },
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
      { src: '/properties/coulsdon-bedroom.jpg', alt: 'Bedroom at Coulsdon', illustrative: false },
      { src: '/images/homes/coulsdon-kitchen.webp', alt: 'A kitchen (illustrative)', illustrative: true },
      { src: '/images/homes/coulsdon-bathroom.webp', alt: 'A bathroom (illustrative)', illustrative: true },
      { src: '/images/homes/coulsdon-living.webp', alt: 'A living room (illustrative)', illustrative: true },
      { src: '/images/homes/coulsdon-front-door.webp', alt: 'A front door (illustrative)', illustrative: true },
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
      { src: '/properties/heathfields-living-room.jpg', alt: 'Living room at Ruby House', illustrative: false },
      { src: '/images/homes/ruby-bedroom.webp', alt: 'A bedroom (illustrative)', illustrative: true },
      { src: '/images/homes/ruby-bathroom.webp', alt: 'A bathroom (illustrative)', illustrative: true },
      { src: '/images/homes/ruby-kitchen.webp', alt: 'A kitchen (illustrative)', illustrative: true },
      { src: '/images/homes/ruby-street.webp', alt: 'A residential street (illustrative)', illustrative: true },
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
      { src: '/images/homes/milne-house-front.webp', alt: 'A house front (illustrative)', illustrative: true },
      { src: '/images/homes/milne-bedroom.webp', alt: 'A bedroom (illustrative)', illustrative: true },
      { src: '/images/homes/milne-kitchen.webp', alt: 'A kitchen (illustrative)', illustrative: true },
      { src: '/images/homes/milne-living.webp', alt: 'A living room (illustrative)', illustrative: true },
      { src: '/images/homes/milne-bathroom.webp', alt: 'A bathroom (illustrative)', illustrative: true },
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
};

/** Card photo for "Other homes": the main gallery photo. */
export function cardPhoto(slug: string) {
  return homeDetails[slug]?.gallery[0];
}
