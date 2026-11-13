'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { aboutNav, serviceNav, type NavItem } from '@/lib/navigation';
import { referralEmail, referralPhone, referralPhoneHref } from '@/lib/contact';

function isActive(pathname: string, href: string) {
  return pathname === href;
}

function DesktopDropdown({
  label,
  items,
  active,
}: {
  label: string;
  items: NavItem[];
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const menuId = useId();

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      className="pc-dropdown"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={onKeyDown}
    >
      <button
        ref={trigger}
        type="button"
        className={`pc-nav-trigger ${active ? 'active' : ''}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(true)}
      >
        {label}
        <img
          className="pc-chevron"
          src="/icons/chevron-down-navy.svg"
          alt=""
          width={13}
          height={9}
        />
      </button>
      <div id={menuId} className={`pc-dropdown-popover ${open ? 'open' : ''}`}>
        <div className="pc-dropdown-panel">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`pc-dropdown-item ${isActive(pathname, item.href) ? 'active' : ''}`}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
            >
              <span className="pc-dropdown-title">{item.label}</span>
              {item.description ? (
                <span className="pc-dropdown-description">
                  {item.description}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileGroup({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(true);
  const listId = useId();
  const pathname = usePathname();

  return (
    <div className="pc-mobile-group">
      <button
        type="button"
        className="pc-mobile-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <img
          className="pc-chevron"
          src="/icons/chevron-down-navy.svg"
          alt=""
          width={17}
          height={12}
        />
      </button>
      <div id={listId} className="pc-mobile-submenu" hidden={!open}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.href) ? 'active' : ''}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            onClick={onNavigate}
          >
            <span className="pc-mobile-link-title">{item.label}</span>
            {item.description ? (
              <span className="pc-mobile-link-description">
                {item.description}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Mobile menu shows the About items with simpler labels, as in the design.
const mobileAboutNav: NavItem[] = [
  { href: '/about', label: 'About us' },
  { href: '/about/who-we-are', label: 'Who we are' },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const servicesActive =
    serviceNav.some((item) => item.href === pathname) ||
    pathname.startsWith('/homes/');
  const aboutActive = pathname === '/about' || pathname.startsWith('/about/');

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open && headerRef.current) {
      const bottom = headerRef.current.getBoundingClientRect().bottom;
      document.documentElement.style.setProperty('--pc-menu-top', `${bottom}px`);
    }
    document.body.classList.toggle('pc-menu-open', open);
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      menuButton.current?.focus();
    }
    if (open) document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('pc-menu-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <a className="skip-link" href="#content">
        Skip to main content
      </a>
      <div className="pc-utility-bar">
        <div className="shell pc-utility-inner">
          <div className="pc-utility-contact">
            <a href={referralPhoneHref}>
              <img src="/icons/phone-white.svg" alt="" width={9} height={15} />
              {referralPhone}
            </a>
            <a href={`mailto:${referralEmail}`}>
              <img src="/icons/mail-white.svg" alt="" width={15} height={12} />
              <span className="pc-utility-email">{referralEmail}</span>
              <span className="pc-utility-email-short">Email us</span>
            </a>
          </div>
          <Link className="pc-utility-link" href="/contact">
            Contact
          </Link>
        </div>
      </div>
      <header className="pc-header" ref={headerRef}>
        <div className="shell pc-header-inner">
          <Link className="pc-brand" href="/" aria-label="Pearl Connexions home">
            <Image
              src="/brand/pearl-logo-colour.jpg"
              alt="Pearl Connexions"
              width={1080}
              height={678}
              priority
            />
          </Link>
          <nav className="pc-desktop-nav" aria-label="Main navigation">
            <DesktopDropdown
              label="Our services"
              items={serviceNav}
              active={servicesActive}
            />
            <DesktopDropdown
              label="About us"
              items={aboutNav}
              active={aboutActive}
            />
            <Link className="pc-button" href="/referrals">
              Make a referral
            </Link>
          </nav>
          <button
            ref={menuButton}
            type="button"
            className="pc-menu-button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? (
              <img src="/icons/cross-white.svg" alt="" width={18} height={18} />
            ) : (
              <img src="/icons/menu-white.svg" alt="" width={22} height={16} />
            )}
          </button>
        </div>
        <nav
          id="mobile-navigation"
          className={`pc-mobile-menu ${open ? 'open' : ''}`}
          aria-label="Mobile navigation"
          hidden={!open}
        >
          <div className="pc-mobile-panel">
            <MobileGroup
              label="Our services"
              items={serviceNav}
              onNavigate={closeMenu}
            />
            <MobileGroup
              label="About us"
              items={mobileAboutNav}
              onNavigate={closeMenu}
            />
            <div className="pc-mobile-group">
              <Link className="pc-mobile-toggle" href="/contact" onClick={closeMenu}>
                Contact
              </Link>
            </div>
            <div className="pc-mobile-spacer" />
            <Link className="pc-button pc-button-block" href="/referrals" onClick={closeMenu}>
              Make a referral
            </Link>
            <div className="pc-mobile-contact">
              <a href={referralPhoneHref}>
                <img src="/icons/phone-navy.svg" alt="" width={9} height={14} />
                {referralPhone}
              </a>
              <a href={`mailto:${referralEmail}`}>
                <img src="/icons/mail-navy.svg" alt="" width={14} height={11} />
                {referralEmail}
              </a>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
