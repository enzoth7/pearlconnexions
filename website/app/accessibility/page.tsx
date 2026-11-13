import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Accessibility',
  description: 'How we make the Pearl Connexions website accessible, and how to ask for information in another format.',
};

// Draft. Text in [square brackets] must be confirmed by Pearl before launch.
export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility"
      intro="We want everyone to be able to use this website, including people who use assistive technology or need information in a different way."
      updated="Statement prepared: [publication date]"
      sections={[
        {
          title: 'Our approach',
          body: [
            'We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. This means you should be able to:',
            '•Zoom in up to 400% without losing content.',
            '•Use the whole site with a keyboard.',
            '•Use a screen reader or voice control.',
            '•Read text with strong colour contrast.',
            '•Understand images through text descriptions.',
          ],
        },
        {
          title: 'Plain language',
          body: ['We write in short, clear sentences and explain any terms used in health and social care.'],
        },
        {
          title: 'Known issues',
          body: ['[To complete after accessibility testing before launch.]'],
        },
        {
          title: 'Information in other formats',
          body: [
            'If you need information in another format, such as easy read, large print or audio, contact us and tell us what would help. [Formats to confirm with Pearl.]',
          ],
        },
        {
          title: 'Feedback and contact',
          body: [
            'If something on this website is hard to use, please tell us. Email admin@pearlconnexions.co.uk or call 07470 906740.',
          ],
        },
      ]}
    />
  );
}
