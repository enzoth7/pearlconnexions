import Link from 'next/link';
import Image from 'next/image';
import type React from 'react';
import type { ReactNode } from 'react';

/** Hand-drawn Khushmeen doodle icon from /public/icons. */
export function Icon({
  name,
  width,
  height,
  className,
}: {
  name: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <img
      className={className ? `pc-icon ${className}` : 'pc-icon'}
      src={`/icons/${name}.svg`}
      alt=""
      width={width}
      height={height}
      aria-hidden="true"
    />
  );
}

/** Text link followed by the hand-drawn arrow. One per block, never a second pill. */
export function ArrowLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  const content = (
    <>
      <span>{children}</span>
      <Icon name="arrow-right-navy" width={23} height={13} />
    </>
  );
  if (external) {
    return (
      <a className="pc-arrow-link" href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link className="pc-arrow-link" href={href}>
      {content}
    </Link>
  );
}

/** Light blue hand-drawn underline under one key word. At most one per section. */
export function Underline({ children }: { children: ReactNode }) {
  return <strong className="pc-underline">{children}<svg viewBox="0 0 221 14" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M3.315 9.625C57.46 3.5 137.02 1.75 217.685 6.125" /></svg></strong>;
}

/** Loose hand-drawn circle around one key word. */
export function Circled({ children }: { children: ReactNode }) {
  return <strong className="pc-circled">{children}<svg viewBox="0 0 200 78" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M146 8.775C96 -0.975 26 5.85 9 35.1C-3 58.5 52 75.075 112 73.125C170 71.175 199 54.6 193 33.15C187 14.625 152 4.875 104 8.775" /></svg></strong>;
}

/** Photo with the light blue offset outline used across the site. */
export function OffsetPhoto({
  src,
  alt,
  width,
  height,
  outline = 'left',
  priority = false,
  unoptimized = false,
  sizes = '(max-width: 900px) 100vw, 500px',
  frame,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  outline?: 'left' | 'right';
  priority?: boolean;
  unoptimized?: boolean;
  sizes?: string;
  /** Displayed photo size in the design (without the 24px outline offset). */
  frame?: { w: number; h: number };
}) {
  const style = frame
    ? ({
        '--photo-w': `${frame.w + 24}px`,
        '--photo-h': `${frame.h}px`,
      } as React.CSSProperties)
    : undefined;
  return (
    <div className={`pc-offset-photo outline-${outline}`} style={style}>
      <Image
        className="pc-photo"
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
      />
    </div>
  );
}

/** CQC registration block. Sits at the bottom of the page, above the footer. */
export function CqcCard() {
  const href = 'https://www.cqc.org.uk/provider/1-13779677400/registration-info';
  return (
    <section className="pc-cqc" aria-labelledby="cqc-heading">
      <div className="shell">
        <div className="pc-cqc-card">
          <a
            className="pc-cqc-logo"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Care Quality Commission registration (opens in a new tab)"
          >
            <img src="/brand/cqc-logo.png" alt="" width={240} height={77} />
          </a>
          <div className="pc-cqc-copy">
            <h2 id="cqc-heading">Registered care. Clear accountability.</h2>
            <p>
              Pearl Connexions is registered with the Care Quality Commission for
              personal care.
            </p>
            <ArrowLink href={href} external>
              View our CQC registration
            </ArrowLink>
          </div>
        </div>
      </div>
    </section>
  );
}
