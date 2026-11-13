import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy notice',
  description:
    'How Pearl Connexions (PC) CIC collects, uses and protects personal information.',
};

// Draft. Text in [square brackets] must be confirmed by Pearl before launch.
// See assets/website-legal-pages-pendientes.md.
export default function PrivacyNoticePage() {
  return (
    <LegalPage
      title="Privacy notice"
      intro="This notice explains how Pearl Connexions (PC) CIC collects, uses and protects personal information when you contact us, make a referral or receive support from us."
      updated="Last updated: [publication date]"
      sections={[
        {
          title: 'Who we are',
          body: [
            'Pearl Connexions (PC) CIC is a Community Interest Company registered in England and Wales, company number 13294525. Our office is at 24 Totterdown Street, London SW17 8TA.',
            'We are the data controller for the information described in this notice. ICO registration number: [to confirm].',
          ],
        },
        {
          title: 'Information we collect',
          body: [
            '•Contact details you give us, such as your name, organisation, email address and phone number.',
            '•Referral information, including the person’s needs, wishes, history, risks and support plans.',
            '•Health and care information. This is special category data and we treat it with extra care.',
            '•Records we create while supporting someone, such as support plans, progress reviews and incident records.',
          ],
        },
        {
          title: 'How we use it',
          body: [
            '•To respond to enquiries and referrals.',
            '•To assess whether a placement is suitable and plan a safe transition.',
            '•To provide support and meet our regulatory duties, including those set by the Care Quality Commission.',
            '•To keep people safe and improve the quality of our services.',
          ],
        },
        {
          title: 'Our lawful basis',
          body: [
            'We use personal information where it is necessary for a contract or public task with the commissioning local authority or NHS body, or for our legitimate interests in running a safe service.',
            'Health and care information is used to provide health or social care, as allowed by UK GDPR Article 9(2)(h), and to protect someone’s vital interests where they are at risk. [Lawful bases to confirm with Pearl’s data protection lead.]',
          ],
        },
        {
          title: 'Who we share it with',
          body: [
            'We only share information with people who need it to support the person safely. This can include the referring local authority or NHS team, social workers and other professionals in the person’s network, regulators such as the Care Quality Commission, and emergency services if someone is at risk.',
            'We do not sell personal information.',
          ],
        },
        {
          title: 'How long we keep it',
          body: [
            '•Enquiries and referrals that do not lead to a placement: [period to confirm].',
            '•Care and support records: [period to confirm, in line with the Records Management Code of Practice for Health and Social Care].',
          ],
        },
        {
          title: 'How we protect it',
          body: [
            'Identifiable records are shared through a secure channel agreed with us. Access is limited to the staff who need it to provide support. [Storage systems and providers to confirm.]',
          ],
        },
        {
          title: 'Cookies and analytics',
          body: [
            'We use privacy-friendly analytics to understand how the website is used. They do not use cookies or identify individual visitors. [Confirm tools before launch.]',
          ],
        },
        {
          title: 'Your rights',
          body: [
            'You can ask to see the information we hold about you, ask us to correct it, ask us to delete it or limit how we use it, and object to how we use it. Some rights depend on our legal duties as a care provider.',
            'To make a request, contact us using the details below. We will reply within one month.',
          ],
        },
        {
          title: 'Contact and complaints',
          body: [
            'Email admin@pearlconnexions.co.uk or call 07470 906740.',
            'If you are unhappy with how we have handled your information, you can complain to the Information Commissioner’s Office at ico.org.uk or on 0303 123 1113.',
          ],
        },
      ]}
    />
  );
}
