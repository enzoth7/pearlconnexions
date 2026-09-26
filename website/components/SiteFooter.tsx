import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <img src="/footer-logo-white.png" alt="Pearl Connexions" />
        </div>
        <div>
          <h2>Provisions</h2>
          <Link href="/supported-living">Supported Living</Link>
          <Link href="/supported-accommodation">Supported Accommodation</Link>
          <Link href="/childrens-home">Children’s Home</Link>
        </div>
        <div>
          <h2>Get in touch</h2>
          <a href="tel:+447470906740">
            <Phone />
            07470 906 740
          </a>
          <a href="mailto:operations@pearlconnexions.com">
            <Mail />
            operations@pearlconnexions.com
          </a>
          <div className="footer-location">South Croydon, London</div>
        </div>
      </div>
      <div className="shell footer-bottom">
        <div>© 2026 Pearl Connexions CIC</div>
      </div>
    </footer>
  );
}
