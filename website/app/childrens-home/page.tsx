import type { Metadata } from 'next';
import ProvisionPage, { type Provision } from '@/components/ProvisionPage';
import { homesFor } from '@/lib/homes';

export const metadata: Metadata = { title: 'Children’s Home' };

const data: Provision = {
  title: 'Children’s Home',
  intro:
    'A nurturing residential home where children and young people can feel safe, build trusted relationships and make progress.',
  regulator: 'Ofsted children’s homes framework',
  regulatorCopy:
    'This provision is shaped around the Children’s Homes (England) Regulations 2015 and the quality standards for residential care.',
  provisionLabel: 'Children’s Home',
  homes: homesFor('childrens-home'),
};

export default function Page() {
  return <ProvisionPage data={data} />;
}
