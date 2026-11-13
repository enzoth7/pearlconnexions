import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { HomeGallery } from '@/components/HomeGallery';
import { ArrowLink, Icon } from '@/components/pc';
import { homeBySlug, homes } from '@/lib/homes';
import { cardPhoto, homeDetails, type IconRef } from '@/lib/home-details';
import { referralPhone, referralPhoneHref } from '@/lib/contact';

type HomePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return homes.map((home) => ({ slug: home.slug }));
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { slug } = await params;
  const home = homeBySlug(slug);
  if (!home) return {};
  return {
    title: home.name,
    description: `${home.name}, ${home.location}. ${home.overview}`,
  };
}

/** Icon scaled so its longest side matches `size`. */
function SizedIcon({ icon, size }: { icon: IconRef; size: number }) {
  const w = icon.ratio >= 1 ? size : Math.round(size * icon.ratio);
  const h = icon.ratio >= 1 ? Math.round(size / icon.ratio) : size;
  return <Icon name={icon.name} width={w} height={h} />;
}

export default async function HomePage({ params }: HomePageProps) {
  const { slug } = await params;

  if (slug === 'victoria-road') redirect('/supported-accommodation');
  if (slug === 'brambles-acre') redirect('/childrens-home');
  if (slug === 'friday-road') redirect('/supported-living');

  const home = homeBySlug(slug);
  const detail = homeDetails[slug];
  if (!home || !detail) notFound();

  const others = homes.filter((other) => other.slug !== home.slug);
  const { lat, lon } = detail.mapCenter;
  const mapBounds = [lon - 0.02, lat - 0.012, lon + 0.02, lat + 0.012]
    .map((coordinate) => coordinate.toFixed(4))
    .join(',');
  const openStreetMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(mapBounds)}&layer=mapnik`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${detail.area}, London, UK`)}`;

  return (
    <main id="content">
      <section className="pc-home-intro">
        <div className="shell">
          <Link className="pc-back-link" href={home.provisionHref}>
            Back to {home.provisionTitle}
          </Link>
          <h1>{home.name}</h1>
          <p className="pc-home-meta">
            <span className="pc-home-meta-location">
              <Icon name="location-navy-11" width={11} height={18} />
              {home.location}
            </span>
            <span aria-hidden="true">·</span>
            <span>{home.provisionTitle}</span>
            <span aria-hidden="true">·</span>
            <span>{home.audience}</span>
          </p>
          <HomeGallery name={home.name} photos={detail.gallery} />
        </div>
      </section>

      <section className="pc-home-body">
        <div className="shell pc-home-body-grid">
          <div className="pc-home-details">
            <section>
              <h2>About this home</h2>
              <p className="pc-home-overview">{home.overview}</p>
              <ul className="pc-home-facts">
                {detail.facts.map((fact) => (
                  <li key={fact.title}>
                    <SizedIcon icon={fact.icon} size={30} />
                    <strong>{fact.title}</strong>
                    <span>{fact.text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>What this home offers</h2>
              <ul className="pc-home-offers">
                {detail.offers.map((offer) => (
                  <li key={offer.label}>
                    <span className="pc-home-offer-icon">
                      <SizedIcon icon={offer.icon} size={26} />
                    </span>
                    {offer.label}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Living at {home.name}</h2>
              <div className="pc-home-living">
                {detail.living.map((block) => (
                  <div key={block.title}>
                    <h3>{block.title}</h3>
                    <p>{block.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2>Where you’ll be</h2>
              <iframe
                className="pc-home-map"
                src={openStreetMapUrl}
                title={`Interactive map of the approximate ${detail.area} area`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
              <p className="pc-home-map-note">
                Approximate area. The exact address is shared during the referral
                process.
              </p>
              <a className="pc-home-map-link" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                Open {detail.area} in Google Maps
              </a>
              <ul className="pc-home-nearby">
                {detail.nearby.map((item) => (
                  <li key={item.title}>
                    <SizedIcon icon={item.icon} size={28} />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="pc-enquiry-sticky" aria-labelledby="ask-heading">
            <h2 id="ask-heading">Ask about this home</h2>
            <p>
              Exact address and availability are shared safely during the
              referral process. A vacancy does not automatically mean a suitable
              match.
            </p>
            <dl>
              <div>
                <dt>Provision</dt>
                <dd>{home.provisionTitle}</dd>
              </div>
              <div>
                <dt>Who it is for</dt>
                <dd>{home.audience}</dd>
              </div>
              <div>
                <dt>Area</dt>
                <dd>{home.location}</dd>
              </div>
            </dl>
            <Link className="pc-button pc-button-block" href="/referrals">
              Discuss a referral
            </Link>
            <a className="pc-call-line" href={referralPhoneHref}>
              Or call {referralPhone}
            </a>
          </aside>
        </div>
      </section>

      <section className="pc-other-homes">
        <div className="shell">
          <h2>Other supported living homes</h2>
          <div className="pc-other-grid">
            {others.map((other) => {
              const photo = cardPhoto(other.slug);
              return (
                <article key={other.slug}>
                  <Link className="pc-other-media" href={`/homes/${other.slug}`} tabIndex={-1} aria-hidden="true">
                    {photo ? (
                      <Image
                        className={photo.illustrative ? 'pc-photo' : undefined}
                        src={photo.src}
                        alt=""
                        fill
                        sizes="(max-width: 900px) 120px, 370px"
                      />
                    ) : null}
                  </Link>
                  <div>
                    <h3>{other.name}</h3>
                    <p>{other.location}</p>
                    <ArrowLink href={`/homes/${other.slug}`}>View {other.name}</ArrowLink>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
