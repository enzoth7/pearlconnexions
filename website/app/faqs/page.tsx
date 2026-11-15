import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { withPlaceholders } from '@/components/LegalPage';
import { ArrowLink } from '@/components/pc';
import { faqGroups, type FaqGroup } from '@/lib/faqs';
import { referralEmail, referralPhone, referralPhoneHref } from '@/lib/contact';

export const metadata: Metadata = {
  title: 'FAQs',
  description:
    'Short answers about supported living, referrals and moving in, and everyday life at Pearl Connexions.',
};

/** Answer text with an optional link to another page and [to confirm] placeholders. */
function Answer({ item }: { item: FaqGroup['items'][number] }) {
  if (!item.link) return <>{withPlaceholders(item.answer)}</>;
  const [before, after] = item.answer.split(item.link.text);
  const parts: ReactNode[] = [
    ...withPlaceholders(before),
    <Link key="link" href={item.link.href}>
      {item.link.text}
    </Link>,
    ...withPlaceholders(after ?? ''),
  ];
  return <>{parts}</>;
}

function ToggleIcon() {
  return (
    <svg className="pc-faq-toggle" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <path className="pc-faq-toggle-v" d="M14 5.5v17" />
      <path d="M5.5 14h17" />
    </svg>
  );
}

export default function FaqsPage() {
  return (
    <main id="content">
      <section className="pc-legal-header">
        <div className="shell">
          <h1>Your questions, answered.</h1>
          <p className="pc-legal-intro">
            Short answers for people seeking support, families and
            professionals. If your question is not here, speak with Pearl.
          </p>
        </div>
      </section>

      <div className="shell pc-legal-body">
        <nav className="pc-legal-index" aria-label="On this page">
          <p>On this page</p>
          <ul>
            {faqGroups.map((group) => (
              <li key={group.id}>
                <a href={`#${group.id}`}>{group.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pc-faq-content">
          {faqGroups.map((group, groupIndex) => (
            <section className="pc-faq-group" id={group.id} key={group.id}>
              <h2>{group.title}</h2>
              <div className="pc-faq-list">
                {group.items.map((item, itemIndex) => (
                  <details
                    className="pc-faq-item"
                    key={item.question}
                    open={groupIndex === 0 && itemIndex === 0}
                  >
                    <summary>
                      <strong className="pc-faq-question">{item.question}</strong>
                      <ToggleIcon />
                    </summary>
                    <div className="pc-faq-answer">
                      <Answer item={item} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <aside className="pc-faq-help" aria-labelledby="faq-help-heading">
            <h2 id="faq-help-heading">Still have a question?</h2>
            <div>
              Call <a href={referralPhoneHref}>{referralPhone}</a> or email{' '}
              <a href={`mailto:${referralEmail}`}>{referralEmail}</a> and we will
              help you find the right answer.
            </div>
            <ArrowLink href="/contact">Contact the team</ArrowLink>
          </aside>
        </div>
      </div>
    </main>
  );
}
