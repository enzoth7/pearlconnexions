'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  ['/supported-living', 'Supported Living'],
  ['/supported-accommodation', 'Supported Accommodation'],
  ['/childrens-home', 'Children’s Home'],
  ['/about', 'About us'],
  ['/referrals', 'Referrals'],
  ['/contact', 'Contact'],
] as const;

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href="/" aria-label="Pearl Connexions home">
            <img src="/pearl-logo.png" alt="Pearl Connexions" />
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map(([href, label]) => (
              <Link
                className={pathname === href ? 'active' : ''}
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="menu-button"
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <div
        id="mobile-navigation"
        className={`mobile-nav ${open ? 'open' : ''}`}
      >
        <nav aria-label="Mobile navigation">
          {links.map(([href, label]) => (
            <Link
              className={pathname === href ? 'active' : ''}
              href={href}
              key={href}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
