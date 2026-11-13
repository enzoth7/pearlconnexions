import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLink, Icon, OffsetPhoto } from '@/components/pc';

/** Pale blue hero band with a photo on the right and a brushed bottom edge. */
export function TintHero({
  title,
  intro,
  photo,
  marks = false,
  children,
}: {
  title: ReactNode;
  intro: ReactNode;
  photo: { src: string; alt: string; width: number; height: number; frame: { w: number; h: number } };
  marks?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="pc-tint-hero">
      <div className="shell pc-tint-hero-inner">
        <div className="pc-tint-hero-text">
          {marks ? <Icon name="spark-marks" width={64} height={44} className="pc-spark" /> : null}
          <h1>{title}</h1>
          <p className="pc-tint-hero-intro">{intro}</p>
          {children}
        </div>
        <OffsetPhoto
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          outline="right"
          frame={photo.frame}
          priority
        />
      </div>
      <img className="pc-brushed-edge" src="/icons/brushed-edge.svg" alt="" aria-hidden="true" />
    </section>
  );
}

/** Hand-drawn white edge at the bottom of a pale blue band. Decorative SVG. */
export function BrushedEdge() {
  return <img className="pc-brushed-edge" src="/icons/brushed-edge.svg" alt="" aria-hidden="true" />;
}

/** Rounded pale blue call to action on white, used before the footer. */
export function CtaCard({
  title,
  text,
  button,
  link,
  balancedSpacing = false,
}: {
  title: ReactNode;
  text: ReactNode;
  button: { href: string; label: string };
  link?: { href: string; label: string };
  balancedSpacing?: boolean;
}) {
  return (
    <section className={balancedSpacing ? 'pc-card-section pc-card-section-balanced' : 'pc-card-section'}>
      <div className="shell">
        <div className="pc-rounded-card pc-cta-card">
          <div className="pc-cta-text">
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <div className="pc-cta-actions">
            <Link className="pc-button pc-button-large" href={button.href}>
              {button.label}
            </Link>
            {link ? <ArrowLink href={link.href}>{link.label}</ArrowLink> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Three columns separated by fine vertical rules, each with an icon. */
export function RuledColumns({
  items,
}: {
  items: {
    icon: string;
    w: number;
    h: number;
    title: string;
    text: string;
    link?: { href: string; label: string; external?: boolean };
  }[];
}) {
  return (
    <div className="pc-ruled-columns">
      {items.map((item) => (
        <div className="pc-ruled-item" key={item.title}>
          <div className="pc-icon-slot">
            <Icon name={item.icon} width={item.w} height={item.h} />
          </div>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
          {item.link ? (
            <ArrowLink href={item.link.href} external={item.link.external}>
              {item.link.label}
            </ArrowLink>
          ) : null}
        </div>
      ))}
    </div>
  );
}
