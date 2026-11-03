import type { Metadata } from 'next';
import ProvisionPage, { type Provision } from '@/components/ProvisionPage';
import { homesFor } from '@/lib/homes';

export const metadata: Metadata = {
  title: 'Supported Living',
  description:
    'Explore Pearl Connexions supported living settings for adults aged 18+ in Vauxhall, Coulsdon, South Croydon and New Addington.',
};

const data: Provision = {
  title: 'Supported Living',
  intro:
    'Supported living for adults aged 18+ across four South London settings. We consider the person, the environment and existing residents before confirming a placement.',
  homes: homesFor('supported-living'),
};

export default function Page() {
  return <ProvisionPage data={data} />;
}
