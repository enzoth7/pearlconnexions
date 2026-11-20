import { Icon } from '@/components/pc';

const groups = [
  'Autism',
  'Learning disabilities',
  'Mental health needs',
  'Complex support needs',
  'Experienced care leavers',
  'Experience of homelessness',
];

/** “Who we support.” Heading and intro on the left, groups and approach note on the right. */
export default function WhoWeSupport() {
  return (
    <section className="pc-who">
      <div className="shell pc-who-inner">
        <div className="pc-who-head">
          <h2 className="pc-h2-display">Who we support.</h2>
          <p className="pc-who-intro">
            Our support starts with each person’s strengths, preferences and the
            goals they want to reach.
          </p>
        </div>
        <div className="pc-who-body">
          <ul className="pc-who-groups">
            {groups.map((group) => (
              <li key={group}>
                <Icon name="tick" width={19} height={13} />
                {group}
              </li>
            ))}
          </ul>
          <p className="pc-who-note">
            Our approach includes independent living skills and positive
            behaviour support (PBS). We assess each enquiry individually,
            including whether the home and the support can meet the person’s
            needs.
          </p>
        </div>
      </div>
    </section>
  );
}
