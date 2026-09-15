import { ArrowRight, Check, Menu } from 'lucide-react';

const support = [
  ['A safe, settled home', 'Comfortable accommodation, clear boundaries and support from people who take time to listen.'],
  ['A plan that is personal', 'Goals shaped around each young person’s needs, strengths, identity and pathway plan.'],
  ['Skills for adult life', 'Practical support with education, health, relationships, money and everyday living.'],
];

export default function Home() {
  return <main>
    <a className="skip-link" href="#content">Skip to main content</a>
    <header><div className="shell header-inner">
      <a className="logo-link" href="#home" aria-label="Pearl Connexions home">{/* oxlint-disable-next-line next/no-img-element */}<img src="/pearl-connexions-logo.png" alt="Pearl Connexions Care Services"/></a>
      <nav aria-label="Main navigation"><a href="#about">About</a><a href="#support">How we support</a><a href="#referrals">Referrals</a><a href="#contact">Contact</a></nav>
      <a className="header-action" href="mailto:admin@pearlconnexions.com?subject=Placement%20enquiry">Placement enquiry <ArrowRight size={17}/></a>
      <button className="menu" aria-label="Open menu"><Menu/></button>
    </div></header>

    <section id="home" className="hero"><div className="hero-shade"/><div className="shell hero-content" id="content">
      <h1>A stable home.<br/>Support that moves life forward.</h1>
      <div className="hero-copy">Pearl Connexions provides supported homes for young people aged 16 and over, combining day-to-day stability with practical preparation for independence.</div>
      <div className="actions"><a className="button light" href="mailto:admin@pearlconnexions.com?subject=Placement%20referral">Make a referral <ArrowRight size={18}/></a><a className="plain-link" href="#about">Learn about Pearl Connexions</a></div>
    </div></section>

    <section className="proof"><div className="shell proof-grid"><div><strong>Person-centred</strong><small>Support shaped around the individual</small></div><div><strong>Safeguarding-led</strong><small>Safety considered at every stage</small></div><div><strong>Outcome-focused</strong><small>Progress tracked and communicated</small></div><div><strong>Partnership-based</strong><small>Close work with placing teams</small></div></div></section>

    <section id="about" className="section shell intro">
      <h2>Young people deserve more than a placement.</h2>
      <div className="intro-copy"><div>They deserve a home where they are known, respected and able to build a future at their own pace.</div><div>Pearl Connexions combines a homely environment with structured, individual support. We work alongside young people and their professional network to create stability, strengthen independence and make progress visible.</div></div>
    </section>

    <section id="support" className="support-section"><div className="shell support-grid">
      <div className="support-photo">{/* oxlint-disable-next-line next/no-img-element */}<img src="/home-interior.jpg" alt="Young people spending time together outdoors"/></div>
      <div className="support-content"><h2>Life skills are built through real life.</h2><div className="support-list">{support.map(([title,copy])=><article key={title}><h3>{title}</h3><div>{copy}</div></article>)}</div></div>
    </div></section>

    <section id="referrals" className="section professional"><div className="shell professional-grid">
      <h2>Clear information. Responsible decisions. Consistent communication.</h2>
      <div className="professional-copy"><div>Every referral is considered against individual need, compatibility and the support we can safely provide. Once a placement begins, we maintain clear plans, risk management and regular reporting.</div><ul><li><Check/>Needs-led placement consideration</li><li><Check/>Individual support and risk planning</li><li><Check/>Weekly reporting and outcome tracking</li><li><Check/>Coordinated multi-agency working</li></ul><a className="button gold" href="mailto:admin@pearlconnexions.com?subject=Request%20service%20information">Request service information <ArrowRight size={18}/></a></div>
    </div></section>

    <section id="contact" className="contact"><div className="shell contact-grid"><h2>Talk to us about a young person.</h2><div><a href="mailto:admin@pearlconnexions.com">admin@pearlconnexions.com</a><a href="tel:+447470906740">07470 906 740</a></div></div></section>
    <footer><div className="shell footer-grid"><div className="footer-logo">{/* oxlint-disable-next-line next/no-img-element */}<img src="/pearl-connexions-logo.png" alt="Pearl Connexions Care Services"/></div><div>24 Totterdown Street, London, SW17 8TA</div><div>© 2026 Pearl Connexions Care Services</div></div></footer>
  </main>;
}
