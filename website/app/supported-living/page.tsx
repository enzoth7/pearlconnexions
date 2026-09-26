import type { Metadata } from 'next';
import ProvisionPage, { type Provision } from '@/components/ProvisionPage';
import { homesFor } from '@/lib/homes';

export const metadata: Metadata = { title: 'Supported Living' };

const data: Provision = {
  title: 'Supported Living',
  intro:
    'Female-only supported living for women aged 18+ who need a safe home and personalised support to build greater independence.',
  regulator: 'Care Quality Commission framework',
  regulatorCopy:
    'This provision is developed around CQC expectations for safe, effective, caring, responsive and well-led support.',
  provisionLabel: 'Supported Living',
  homes: homesFor('supported-living'),
};

export default function Page() {
  return <ProvisionPage data={data} />;
}
