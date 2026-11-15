// Frequently asked questions, from the PC-WEBSITE Figma file (FAQs page 186:191).
// Text in [square brackets] is still to be confirmed by Pearl.

export type FaqGroup = {
  id: string;
  title: string;
  items: {
    question: string;
    answer: string;
    /** Words in the answer that link to another page. */
    link?: { text: string; href: string };
  }[];
};

export const faqGroups: FaqGroup[] = [
  {
    id: 'about-supported-living',
    title: 'About supported living',
    items: [
      {
        question: 'Who is supported living for?',
        answer:
          'Adults aged 18+ with learning disabilities, autism, mental health needs or complex support needs, including experienced care leavers and people who have experienced homelessness. We consider each enquiry individually, including whether the home and the support can meet the person’s needs.',
      },
      {
        question: 'Will the person have their own room?',
        answer:
          'Yes. Each person has a furnished bedroom with storage for their belongings, and shares the kitchen, living areas, bathroom facilities and outdoor space with the people they live with.',
      },
      {
        question: 'What does a keyworker do?',
        answer:
          'Each person has a dedicated keyworker who offers guidance, encouragement and advocacy. Together they agree goals, practise everyday skills and review progress.',
      },
      {
        question: 'Will the person be involved in their support plan?',
        answer:
          'Yes. Their wishes and goals shape the plan, and it is reviewed with them and their professional network as things change.',
      },
      {
        question: 'What support is available overnight?',
        answer:
          'Arrangements depend on the home and the agreed support package. Ask us about the specific location. [Overnight arrangements to confirm for each home.]',
      },
    ],
  },
  {
    id: 'referrals-and-moving-in',
    title: 'Referrals and moving in',
    items: [
      {
        question: 'Who can make an enquiry?',
        answer:
          'Local authorities, ICBs, NHS teams, leaving care teams, families, advocates and people seeking support can all contact us to talk through options.',
      },
      {
        question: 'Can someone visit before moving in?',
        answer:
          'Yes. We aim to arrange a viewing and introductions wherever practicable, so the person can see the home and meet the team.',
      },
      {
        question: 'Do you consider urgent referrals?',
        answer:
          'Contact the team to discuss urgency and current availability. Assessment and matching are still needed before any offer. [Process and contact hours to confirm.]',
      },
      {
        question: 'How is a placement funded?',
        answer:
          'Contact us to discuss funding and a tailored quote, including what is and is not included. [Funding routes to confirm.]',
      },
    ],
  },
  {
    id: 'living-at-pearl',
    title: 'Living at Pearl',
    items: [
      {
        question: 'Can family and friends visit?',
        answer:
          'Yes. We support people to keep in touch with family and friends. Visits follow the arrangements agreed for each home, so everyone’s privacy and safety are respected.',
      },
      {
        question: 'What happens if needs change?',
        answer:
          'We listen to the person, review their support and any risks, and involve the relevant professionals early.',
      },
      {
        question: 'How can someone raise a concern?',
        answer:
          'Speak to your support worker, the Registered Manager or any member of staff, or call 07470 906740. Our Feedback and complaints page explains every way to raise a concern and what happens next.',
        link: { text: 'Feedback and complaints', href: '/feedback' },
      },
    ],
  },
];
