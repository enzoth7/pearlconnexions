import type { ReactNode } from 'react';

export type LegalSection = {
  title: string;
  /** Paragraphs. A string starting with "•" is rendered as a bullet. */
  body: string[];
};

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Text in [square brackets] is still to be confirmed by Pearl. */
function withPlaceholders(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\])/g).map((part, index) =>
    part.startsWith('[') ? (
      <span className="pc-to-confirm" key={index}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function LegalPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main id="content">
      <section className="pc-legal-header">
        <div className="shell">
          <h1>{title}.</h1>
          <p className="pc-legal-intro">{intro}</p>
          <p className="pc-legal-updated">{withPlaceholders(updated)}</p>
        </div>
      </section>
      <div className="shell pc-legal-body">
        <nav className="pc-legal-index" aria-label="On this page">
          <p>On this page</p>
          <ul>
            {sections.map((section) => (
              <li key={section.title}>
                <a href={`#${slug(section.title)}`}>{section.title}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="pc-legal-content">
          {sections.map((section) => {
            const bullets = section.body.filter((p) => p.startsWith('•'));
            const paragraphs = section.body.filter((p) => !p.startsWith('•'));
            return (
              <section id={slug(section.title)} key={section.title}>
                <h2>{section.title}</h2>
                {paragraphs.map((p) => (
                  <p key={p}>{withPlaceholders(p)}</p>
                ))}
                {bullets.length ? (
                  <ul>
                    {bullets.map((b) => (
                      <li key={b}>{withPlaceholders(b.slice(1))}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
