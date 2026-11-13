import Link from 'next/link';
import Image from 'next/image';
import {
  officeAddress,
  referralEmail,
  referralPhone,
  referralPhoneHref,
} from '@/lib/contact';
import { footerExploreNav, officialBadges } from '@/lib/navigation';

export default function SiteFooter() {
  return (
    <footer className="pc-footer">
      <div className="shell pc-footer-grid">
        <div className="pc-footer-brand">
          <Link href="/" aria-label="Pearl Connexions home">
            <Image
              src="/brand/pearl-logo-white.png"
              alt="Pearl Connexions"
              width={688}
              height={274}
            />
          </Link>
          <p className="pc-footer-phrase">Where every connexion counts</p>
          <div className="pc-footer-badges">
            <p>Registered and listed with</p>
            <div className="pc-badge-row">
              {officialBadges.map((badge) => (
                <a
                  key={badge.kind}
                  className={`pc-badge pc-badge-${badge.kind}`}
                  href={badge.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={badge.label}
                >
                  <img src={badge.src} alt="" />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="pc-footer-column">
          <h2>Explore</h2>
          {footerExploreNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="pc-footer-column">
          <h2>Get in touch</h2>
          <a className="pc-footer-contact" href={referralPhoneHref}>
            <img src="/icons/phone-white.svg" alt="" width={9} height={15} />
            {referralPhone}
          </a>
          <a className="pc-footer-contact" href={`mailto:${referralEmail}`}>
            <img src="/icons/mail-white.svg" alt="" width={15} height={12} />
            {referralEmail}
          </a>
          <address className="pc-footer-contact pc-footer-address">
            <img src="/icons/location-white.svg" alt="" width={11} height={18} />
            <span>
              {officeAddress.street}
              <span className="pc-comma">, </span>
              <span className="pc-break">{officeAddress.cityAndPostcode}</span>
            </span>
          </address>
        </div>
      </div>
      <div className="shell pc-footer-bottom">
        <p>© 2026 Pearl Connexions (PC) CIC.</p>
      </div>
    </footer>
  );
}
