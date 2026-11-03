import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import type { Home } from '@/lib/homes';

export type Provision = {
  title: string;
  intro: string;
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
              Discuss a referral
            </Link>
          </div>
        </div>
      </section>

      <section className="section shell homes-section">
        <div className="section-heading">
          <h2>Our supported living settings</h2>
          <div className="section-intro homes-intro">
            Each environment has a different fit. Availability, staffing,
            compatibility and support are confirmed through assessment and a
            placement discussion.
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
                <div className="home-card-placeholder" aria-hidden="true">
                  <Image
                    src="/pearl-logo-light.webp"
                    alt=""
                    width={192}
                    height={77}
                  />
                </div>
              )}
              <div className="home-card-content">
                <div className="home-card-title">
                  <h3>{home.name}</h3>
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
