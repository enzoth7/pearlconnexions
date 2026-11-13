import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLink, Icon, OffsetPhoto } from '@/components/pc';
import { RuledColumns } from '@/components/pc-blocks';

/** Bold statement on the left, supporting copy on the right. */
export function Statement({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pc-statement">
      <div className="shell pc-statement-inner">
        <h2>{title}</h2>
        <div className="pc-statement-copy">{children}</div>
      </div>
    </section>
  );
}

/** Hero actions: one primary button and one text link. */
export function HeroActions({
  button,
  link,
}: {
  button: { href: string; label: string };
  link: { href: string; label: string };
}) {
  return (
    <div className="pc-tint-actions">
      <Link className="pc-button pc-button-large" href={button.href}>
        {button.label}
      </Link>
      <ArrowLink href={link.href}>{link.label}</ArrowLink>
    </div>
  );
}

/** Heading with a subtitle below, followed by three ruled columns. */
export function HeadedColumns({
  title,
  subtitle,
  items,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  items: Parameters<typeof RuledColumns>[0]['items'];
}) {
  return (
    <section className="pc-headed-columns">
      <div className="shell">
        <h2 className="pc-h2-display">{title}</h2>
        <p className="pc-headed-subtitle">{subtitle}</p>
        <div className="pc-headed-columns-body">
          <RuledColumns items={items} />
        </div>
      </div>
    </section>
  );
}

/** Pale blue band with a square photo on the left and text on the right. */
export function TintSplit({
  photo,
  title,
  paragraphs,
  link,
}: {
  photo: { src: string; alt: string; width: number; height: number; unoptimized?: boolean };
  title: ReactNode;
  paragraphs: ReactNode[];
  link: { href: string; label: string };
}) {
  return (
    <section className="pc-split pc-tint">
      <div className="shell pc-split-inner pc-gap-80">
        <OffsetPhoto
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          unoptimized={photo.unoptimized}
          outline="left"
          frame={{ w: 460, h: 460 }}
        />
        <div className="pc-split-text pc-stack-20">
          <h2 className="pc-h2-display">{title}</h2>
          {paragraphs.map((text, index) => (
            <p className="pc-body-18" key={index}>
              {text}
            </p>
          ))}
          <ArrowLink href={link.href}>{link.label}</ArrowLink>
        </div>
      </div>
    </section>
  );
}

/** Ofsted context note. Confirm permission to use the logo before launch. */
export function OfstedNote({ children }: { children: ReactNode }) {
  return (
    <div className="pc-ofsted-note">
      <img src="/brand/ofsted-logo.png" alt="Ofsted" width={160} height={82} />
      <p>{children}</p>
    </div>
  );
}

/** Icon grid used for “What support looks like”. */
export function IconGrid({
  title,
  items,
}: {
  title: ReactNode;
  items: { icon: string; w: number; h: number; title: string; text: string }[];
}) {
  return (
    <section className="pc-values">
      <div className="shell">
        <h2 className="pc-h2-display">{title}</h2>
        <div className="pc-values-grid">
          {items.map((item) => (
            <div className="pc-value" key={item.title}>
              <div className="pc-icon-slot pc-icon-slot-44">
                <Icon name={item.icon} width={item.w} height={item.h} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
