import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Planned Children’s Home',
  description:
    'Pearl Connexions is planning a children’s home. Opening is subject to Ofsted registration and this is not a current placement offer.',
};

export default function Page() {
  return (
    <main id="content">
      <section className="page-hero provision-hero">
        <div className="shell provision-hero-grid">
          <div>
            <h1>Children’s Home</h1>
            <div className="lede">
              Pearl Connexions is planning a children’s home. Opening is
              subject to Ofsted registration, so this is not a current
              placement offer.
            </div>
            <Link className="button primary" href="/contact">
              Contact our team
            </Link>
          </div>
        </div>
      </section>

      <section className="section shell about-intro">
        <h2>Planning around the person</h2>
        <div>
          <div className="body-copy">
            The same principles guide this planned service: understand the
            child’s wishes and needs, prepare the right environment and work
            closely with the professional network.
          </div>
          <div className="body-copy">
            For current placement discussions, please contact us about the
            services that are available and their assessed scope.
          </div>
          <Link className="text-link" href="/referrals">
            Discuss a current referral
          </Link>
        </div>
      </section>
    </main>
  );
}
