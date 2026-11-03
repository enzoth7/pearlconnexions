'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

const serviceLinks = [
  ['/supported-living', 'Supported Living'],
  ['/supported-accommodation', 'Supported Accommodation'],
  ['/childrens-home', 'Children’s Home'],
] as const;

const otherLinks = [
  ['/about', 'About us'],
  ['/referrals', 'Referrals'],
  ['/contact', 'Contact'],
] as const;

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollBoundary = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const servicesTrigger = useRef<HTMLButtonElement>(null);
  const suppressNextFocus = useRef(false);
  const pathname = usePathname();
  const overPhoto = pathname === '/' && !scrolled && !open;
  const isServicePage =
    serviceLinks.some(([href]) => pathname === href) ||
    pathname.startsWith('/homes/');

  function closeMobileMenu() {
    setOpen(false);
    setMobileServicesOpen(false);
  }

  function handleServicesKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setServicesOpen(false);
    if (document.activeElement !== servicesTrigger.current) {
      suppressNextFocus.current = true;
      servicesTrigger.current?.focus();
    }
  }

  function handleMobileKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeMobileMenu();
    menuTrigger.current?.focus();
  }

  useEffect(() => {
    const boundary = scrollBoundary.current;
    if (!boundary) return;
    setScrolled(window.scrollY > 64);
    const observer = new IntersectionObserver(([entry]) => {
      setScrolled(!entry.isIntersecting);
    });
    observer.observe(boundary);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={scrollBoundary}
        className="scroll-boundary"
        aria-hidden="true"
      />
      <a className="skip-link" href="#content">
        Skip to main content
      </a>
      <header
        className={`site-header ${overPhoto ? 'over-photo' : ''} ${scrolled || open ? 'material' : ''}`}
      >
        <div className="shell header-inner">
          <Link className="brand" href="/" aria-label="Pearl Connexions home">
            <Image
              className="brand-colour"
              src="/pearl-logo.webp"
              alt="Pearl Connexions"
              width={384}
              height={153}
            />
            <Image
              className="brand-light"
              src="/pearl-logo-light.webp"
              alt=""
              aria-hidden="true"
              width={384}
              height={153}
            />
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <div
              className="desktop-services"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setServicesOpen(false);
              }}
            >
              <button
                ref={servicesTrigger}
                className={`desktop-services-trigger ${isServicePage ? 'active' : ''}`}
                type="button"
                aria-expanded={servicesOpen}
                aria-controls="desktop-services-menu"
                onFocus={() => {
                  if (suppressNextFocus.current) {
                    suppressNextFocus.current = false;
                  } else {
                    setServicesOpen(true);
                  }
                }}
                onClick={() => setServicesOpen(true)}
                onKeyDown={handleServicesKeyDown}
              >
                Our services
              </button>
              <div
                id="desktop-services-menu"
                className={`desktop-services-popover ${servicesOpen ? 'open' : ''}`}
                aria-hidden={!servicesOpen}
              >
                <div className="desktop-services-panel">
                  {serviceLinks.map(([href, label]) => (
                    <Link
                      className={pathname === href ? 'active' : ''}
                      href={href}
                      key={href}
                      tabIndex={servicesOpen ? 0 : -1}
                      onClick={() => setServicesOpen(false)}
                      onKeyDown={handleServicesKeyDown}
                      aria-current={pathname === href ? 'page' : undefined}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {otherLinks.map(([href, label]) => (
              <Link
                className={pathname === href ? 'active' : ''}
                href={href}
                key={href}
                aria-current={pathname === href ? 'page' : undefined}
                onClick={() => setServicesOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            ref={menuTrigger}
            className="menu-button"
            type="button"
            onClick={() => {
              setOpen(!open);
              if (open) setMobileServicesOpen(false);
            }}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onKeyDown={handleMobileKeyDown}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        className={`mobile-nav ${open ? 'open' : ''}`}
      >
        <div className="mobile-nav-inner">
          <div className="mobile-services">
            <button
              className={`mobile-services-trigger ${isServicePage ? 'active' : ''}`}
              type="button"
              aria-expanded={mobileServicesOpen}
              aria-controls="mobile-services-list"
              onClick={() => setMobileServicesOpen((current) => !current)}
              onKeyDown={handleMobileKeyDown}
            >
              Our services
            </button>
            <div
              id="mobile-services-list"
              className="mobile-services-list"
              hidden={!mobileServicesOpen}
            >
              {serviceLinks.map(([href, label]) => (
                <Link
                  className={pathname === href ? 'active' : ''}
                  href={href}
                  key={href}
                  onClick={closeMobileMenu}
                  onKeyDown={handleMobileKeyDown}
                  aria-current={pathname === href ? 'page' : undefined}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          {otherLinks.map(([href, label]) => (
            <Link
              className={pathname === href ? 'active' : ''}
              href={href}
              key={href}
              onClick={closeMobileMenu}
              onKeyDown={handleMobileKeyDown}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
