import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Supported Accommodation',
  description:
    'Information about Pearl Connexions proposed supported accommodation arrangement at Victoria Road. This is not a current placement offer.',
};

const confirmations = [
  {
    title: 'Service arrangements',
    copy: 'The operating agreement, property inclusion and registered provider responsibilities must be settled.',
  },
  {
    title: 'Admission scope',
    copy: 'Age range, suitability criteria, staffing and admission readiness must be confirmed before a placement is considered.',
  },
  {
    title: 'Individual transition',
    copy: 'Any future offer would follow assessment, compatibility checks and an agreed support and transition plan.',
  },
];

export default function Page() {
  return (
    <main id="content">
      <section className="page-hero provision-hero">
        <div className="shell provision-hero-grid">
          <div>
            <h1>Supported Accommodation</h1>
            <div className="lede">
              Victoria Road is being considered through an arrangement with
              GNK Care Services. It is not a current placement offer.
            </div>
            <Link className="button primary" href="/contact">
              Ask about future provision
            </Link>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <h2>What needs to be in place</h2>
          <div className="section-intro homes-intro">
            Supported accommodation for looked after children and care leavers
            aged 16–17 has a separate Ofsted framework. The age range and
            service scope for Victoria Road have not yet been confirmed.
          </div>
        </div>
        <div className="pillar-grid">
          {confirmations.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <div className="pillar-copy">{item.copy}</div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
