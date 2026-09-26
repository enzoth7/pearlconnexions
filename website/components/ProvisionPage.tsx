import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Image as ImageIcon,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import type { Home } from '@/lib/homes';

export type Provision = {
  title: string;
  intro: string;
  regulator: string;
  regulatorCopy: string;
  provisionLabel: string;
  homes: Home[];
};

export default function ProvisionPage({ data }: { data: Provision }) {
  return (
    <main id="content">
      <section className="page-hero provision-hero">
        <div className="shell provision-hero-grid">
          <div>
            <h1>{data.title}</h1>
            <div className="lede">{data.intro}</div>
            <Link className="button primary" href="/referrals">
              Discuss a referral <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="regulation-strip">
        <div className="shell regulation-inner">
          <ShieldCheck />
          <div>
            <strong>{data.regulator}</strong>
            <div className="regulation-copy">{data.regulatorCopy}</div>
          </div>
        </div>
      </section>

      <section className="section shell homes-section">
        <div className="section-heading">
          <h2>Our homes</h2>
          <div className="section-intro homes-intro">
            Available photography is shown below. Remaining images and confirmed
            location details will be added as they are approved. Exact addresses
            can be shared safely during the referral process.
          </div>
        </div>
        <div className="homes-grid">
          {data.homes.map((home) => (
            <Link
              className="home-card"
              href={`/homes/${home.slug}`}
              key={home.slug}
            >
              {home.image ? (
                <div className="home-card-photo">
                  <Image
                    src={home.image}
                    alt={home.imageAlt ?? home.name}
                    fill
                    sizes="(max-width: 600px) 100vw, 50vw"
                  />
                </div>
              ) : (
                <div className="photo-placeholder">
                  <ImageIcon />
                  <div>Photography coming soon</div>
                </div>
              )}
              <div className="home-card-content">
                <div className="home-type">{data.provisionLabel}</div>
                <div className="home-card-title">
                  <h3>{home.name}</h3>
                  <ArrowRight aria-hidden="true" />
                </div>
                <div className="home-location">
                  <MapPin />
                  {home.location}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
