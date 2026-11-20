import Image from 'next/image';

const practice = [
  ['Learning disability', 'Oliver McGowan training and preparation for the person’s support needs.'],
  ['Autism practice', 'Accessible communication, sensory adjustments and predictable routines.'],
  ['Trauma-informed practice', 'Understand experience, relationships and what helps the person feel safe.'],
  ['Safeguarding', 'Recognise contextual risks, share concerns and escalate early.'],
  ['Mental health and risk', 'De-escalation and PMVA training, with planning tailored to the person and their placement.'],
  ['Reflective practice', 'Care Certificate induction, professional boundaries, supervision and management oversight.'],
];

/**
 * “A workforce prepared for the person.” Shared by About and Our services so
 * both pages always show the same training and practice content.
 */
export default function WorkforceSection() {
  return (
    <section className="pc-workforce">
      <div className="shell">
        <h2 className="pc-h2-large">
          A workforce prepared
          <br />
          for the person.
        </h2>
        <div className="pc-workforce-grid">
          <Image
            className="pc-photo pc-shape-c"
            src="/images/about/workforce-training-hd.webp"
            alt="A group of staff in a training session"
            width={3200}
            height={2133}
            unoptimized
            sizes="(max-width: 900px) 100vw, 480px"
          />
          <dl className="pc-practice">
            {practice.map(([title, text]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
