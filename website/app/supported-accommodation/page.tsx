import type { Metadata } from 'next';
import ProvisionPage, { type Provision } from '@/components/ProvisionPage';
import { homesFor } from '@/lib/homes';

export const metadata: Metadata = { title: 'Supported Accommodation' };

const data: Provision = {
  title: 'Supported Accommodation',
  intro:
    'Stable accommodation and practical support for young people aged 16–17 who are preparing for adulthood.',
  regulator: 'Ofsted supported accommodation framework',
  regulatorCopy:
    'This provision is being developed in line with the quality standards and registration requirements for supported accommodation in England.',
  provisionLabel: 'Supported Accommodation',
  homes: homesFor('supported-accommodation'),
};

export default function Page() {
  return <ProvisionPage data={data} />;
}
