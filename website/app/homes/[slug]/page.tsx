import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Image as ImageIcon,
  MapPin,
} from 'lucide-react';
import { homeBySlug, homes } from '@/lib/homes';

type HomePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return homes.map((home) => ({ slug: home.slug }));
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { slug } = await params;
  const home = homeBySlug(slug);

  if (!home) return {};

  return {
    title: home.name,
    description: `${home.name} — ${home.provisionTitle} from Pearl Connexions.`,
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { slug } = await params;
  const home = homeBySlug(slug);

  if (!home) notFound();

  return (
    <main id="content">
      <section className="home-detail-hero">
        <div className="shell home-detail-grid">
          <div className="home-detail-copy">
            <Link className="home-back-link" href={home.provisionHref}>
              <ArrowLeft /> Back to {home.provisionTitle}
            </Link>
            <h1>{home.name}</h1>
            <div className="home-detail-location">
              <MapPin /> {home.location}
            </div>
            <div className="lede">{home.overview}</div>
          </div>
          <div className="home-detail-media">
            {home.image ? (
              <Image
                src={home.image}
                alt={home.imageAlt ?? home.name}
                fill
                priority
                sizes="(max-width: 860px) 100vw, 48vw"
              />
            ) : (
              <div className="home-detail-placeholder">
                <ImageIcon />
                <div>Photography coming soon</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section shell home-detail-content">
        <h2>At a glance</h2>
        <div className="home-detail-facts">
          <div className="home-fact">
            <strong>Provision</strong>
            <div>{home.provisionTitle}</div>
          </div>
          <div className="home-fact">
            <strong>Who it is for</strong>
            <div>{home.audience}</div>
          </div>
          <div className="home-fact">
            <strong>Location</strong>
            <div>{home.location}</div>
          </div>
        </div>
      </section>

      <section className="home-support-section">
        <div className="shell home-support-grid">
          <h2>Support at {home.name}</h2>
          <ul>
            {home.support.map((item) => (
              <li key={item}>
                <Check /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section shell home-detail-contact">
        <div>
          <h2>Ask about this home</h2>
          <div>
            Exact address and availability details can be shared safely during
            the referral process.
          </div>
        </div>
        <Link className="button primary" href="/referrals">
          Discuss a referral <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
