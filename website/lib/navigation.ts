export type NavItem = {
  href: string;
  label: string;
  description?: string;
};

export const serviceNav: NavItem[] = [
  {
    href: '/supported-living',
    label: 'Supported Living',
    description: 'Adults 18+ across four South London homes',
  },
  {
    href: '/supported-accommodation',
    label: 'Supported Accommodation',
    description: 'Victoria Road · information',
  },
  {
    href: '/childrens-home',
    label: 'Children’s Home',
    description: 'Planned · subject to Ofsted registration',
  },
];

export const aboutNav: NavItem[] = [
  {
    href: '/about/who-we-are',
    label: 'Who we are',
    description: 'Our mission, values and accountability',
  },
  {
    href: '/about',
    label: 'Our approach and team',
    description: 'How we match, support and review progress',
  },
];

export const footerExploreNav: NavItem[] = [
  { href: '/supported-living', label: 'Supported Living' },
  { href: '/supported-accommodation', label: 'Supported Accommodation' },
  { href: '/childrens-home', label: 'Children’s Home' },
  { href: '/privacy-notice', label: 'Privacy notice' },
  { href: '/accessibility', label: 'Accessibility' },
];

// Official sources only. Each opens in a new tab.
export const officialBadges = [
  {
    href: 'https://www.cqc.org.uk/location/1-19314630787',
    label: 'Care Quality Commission registration (opens in a new tab)',
    src: '/brand/badge-cqc.png',
    kind: 'cqc',
  },
  {
    href: 'https://find-and-update.company-information.service.gov.uk/company/13294525',
    label: 'Companies House record on GOV.UK (opens in a new tab)',
    src: '/brand/badge-gov-uk.png',
    kind: 'gov',
  },
  {
    href: 'https://www.nhs.uk/services/care-provider/pearl-connexions/1-19314630787',
    label: 'Pearl Connexions on the NHS website (opens in a new tab)',
    src: '/brand/badge-nhs.png',
    kind: 'nhs',
  },
] as const;
