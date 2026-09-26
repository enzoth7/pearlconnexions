import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const provisions = [
  {
    href: '/supported-living',
    label: 'Adults 18+',
    title: 'Supported Living',
    copy: 'A safe, welcoming home for women in South Croydon, with personalised support that builds confidence and independence.',
    regulator: 'CQC framework',
  },
  {
    href: '/supported-accommodation',
    label: 'Young people 16–17',
    title: 'Supported Accommodation',
    copy: 'Stable accommodation and practical support for young people preparing for adulthood and their next chapter.',
    regulator: 'Ofsted framework',
  },
  {
    href: '/childrens-home',
    label: 'Children & young people',
    title: 'Children’s Home',
    copy: 'Nurturing residential care shaped around safety, trusted relationships and individual progress.',
    regulator: 'Ofsted framework',
  },
];

export default function Home() {
  return (
    <main id="content">
      <section className="home-hero">
        <div className="hero-blob hero-blob-one" />
        <div className="hero-blob hero-blob-two" />
        <div className="shell home-hero-grid">
          <div className="hero-copy-block">
            <h1>Safe, nurturing homes.</h1>
            <div className="lede">
              A place where people feel known, supported and able to build a
              more independent future.
            </div>
            <div className="button-row">
              <Link className="button primary" href="/referrals">
                Make a referral <ArrowRight size={18} />
              </Link>
              <Link className="text-link" href="/about">
                Discover our approach <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-wrap">
              <Image
                src="/young-person-reading.jpg"
                alt="A young person relaxing with a book at home"
                fill
                priority
                sizes="(max-width: 860px) 90vw, 48vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading split-heading">
          <div>
            <h2>The right support for each stage of the journey.</h2>
          </div>
          <div className="section-intro">
            Each provision has its own team, approach and regulatory
            framework—connected by the same commitment to dignity, safety and
            meaningful progress.
          </div>
        </div>
        <div className="provision-grid">
          {provisions.map((item, index) => (
            <Link
              className={`provision-card card-${index + 1}`}
              href={item.href}
              key={item.href}
            >
              <div className="card-label">{item.label}</div>
              <h3>{item.title}</h3>
              <div className="card-copy">{item.copy}</div>
              <div className="card-footer">
                <div>{item.regulator}</div>
                <ArrowRight />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
