import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, Phone } from 'lucide-react';
import {
  officeAddress,
  referralEmail,
  referralPhone,
  referralPhoneHref,
} from '@/lib/contact';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Link href="/" aria-label="Pearl Connexions home">
            <Image
              src="/pearl-logo.webp"
              alt="Pearl Connexions"
              width={384}
              height={153}
            />
          </Link>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/supported-living">Supported Living</Link>
          <Link href="/supported-accommodation">Supported Accommodation</Link>
          <Link href="/childrens-home">Children’s Home</Link>
        </div>
        <div>
          <h2>Get in touch</h2>
          <a href={referralPhoneHref}>
            <Phone />
            {referralPhone}
          </a>
          <a href={`mailto:${referralEmail}`}>
            <Mail />
            {referralEmail}
          </a>
          <address className="footer-location">
            <MapPin aria-hidden="true" />
            <div>
              {officeAddress.street}
              <br />
              {officeAddress.cityAndPostcode}
            </div>
          </address>
        </div>
      </div>
      <div className="shell footer-bottom">
        <div>© 2026 Pearl Connexions CIC</div>
      </div>
    </footer>
  );
}
