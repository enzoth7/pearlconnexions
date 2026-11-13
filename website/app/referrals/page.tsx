import type { Metadata } from 'next';
import Image from 'next/image';
import { Circled, Icon, Underline } from '@/components/pc';
import { BrushedEdge } from '@/components/pc-blocks';
import { referralEmail, referralPhone, referralPhoneHref } from '@/lib/contact';

export const metadata: Metadata = {
  title: 'Referrals',
  description:
    'Discuss a supported living placement with Pearl Connexions. Start with an anonymised profile and agree a secure route for sensitive information.',
};

const steps = [
  ['01', 'Review the referral', 'Understand needs, wishes, risks and legal arrangements. Identify any information still needed.'],
  ['02', 'Speak with the network', 'Clarify the person’s history, current plan, desired outcomes and what has helped before.'],
  ['03', 'Meet and view', 'Meet the person and explore the setting wherever practicable, with communication needs in mind.'],
  ['04', 'Check the match', 'Consider compatibility, location, contextual risks and the people already living in the home.'],
  ['05', 'Plan the transition', 'Agree actions, named responsibilities, information transfer, introductions and a start date.'],
  ['06', 'Move in and review', 'Listen to the person’s experience and check whether the support model is working. Adjust where needed.'],
];

const sendFirst = [
  'Age and preferred area',
  'Required start date',
  'Communication and support needs',
  'Key risks and safety considerations',
  'Intended outcomes',
];

export default function ReferralsPage() {
  return (
    <main id="content">
      <section className="pc-referral-hero">
        <div className="shell pc-referral-hero-grid">
          <div>
            <h1 className="pc-h1 pc-referral-title">
              A <Circled>clear</Circled> start to a placement discussion.
            </h1>
            <p className="pc-lede">
              We welcome enquiries from commissioners, social workers, leaving
              care teams and other relevant professionals. Share an anonymised
              profile first so we can discuss fit and next steps.
            </p>
          </div>
          <aside className="pc-speak-card">
            <h2>Speak with Pearl</h2>
            <p>
              We will discuss suitability, current capacity and assessment
              arrangements.
            </p>
            <a href={referralPhoneHref}>
              <Icon name="phone-navy" width={11} height={18} />
              {referralPhone}
            </a>
            <a href={`mailto:${referralEmail}`}>
              <Icon name="mail-navy" width={18} height={14} />
              {referralEmail}
            </a>
          </aside>
        </div>
        <BrushedEdge />
      </section>

      <section className="pc-journey">
        <div className="shell pc-journey-grid">
          <div className="pc-journey-intro">
            <h2 className="pc-h2-display">
              A planned start.
              <br />
              A stronger transition.
            </h2>
            <p>
              Six steps help establish the right match, clear responsibilities and
              a supported start.
            </p>
            <div className="pc-offset-photo outline-right pc-journey-photo">
              <Image
                className="pc-photo"
                src="/images/referrals/referral-conversation.webp"
                alt="Two people talking through a referral at a table"
                width={1400}
                height={934}
                sizes="(max-width: 900px) 100vw, 420px"
              />
            </div>
          </div>
          <ol className="pc-journey-steps">
            {steps.map(([n, title, text]) => (
              <li key={n}>
                <span className="pc-journey-number">{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pc-send-first">
        <div className="shell pc-two-col">
          <div>
            <h2 className="pc-h2">What to send first.</h2>
            <p>
              Start with an anonymised profile. Please agree a secure route with
              us before sending identifiable assessments or sensitive records.
            </p>
          </div>
          <ul className="pc-tick-list">
            {sendFirst.map((item) => (
              <li key={item}>
                <Icon name="tick-white" width={19} height={13} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pc-two-col-statement">
        <div className="shell pc-two-col">
          <h2 className="pc-h2">
            A proposed package reflects the person’s <Underline>needs.</Underline>
          </h2>
          <div className="pc-muted-copy">
            <p>
              Staffing, costs and the basis of support are discussed after
              assessment and against the service’s scope. If an initial assessment
              period is useful, its length, staffing and review date are agreed
              for that person.
            </p>
            <p>
              Reviews consider the person’s voice, observed skills, support still
              needed and any change in risk. Staffing changes are not automatic.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
