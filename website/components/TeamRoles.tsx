'use client';

import { useState } from 'react';
import type React from 'react';
import { ArrowLink, OffsetPhoto } from '@/components/pc';

type Role = {
  title: string;
  description: string;
  name: string;
  photo: string;
  /** Crop anchor for the portrait, when the face sits low in the photo. */
  position?: string;
  /** Only for team members with their own website. */
  link?: { href: string; label: string };
};

// Roles 01 to 06 use temporary stock portraits. Replace each label and image
// together once Pearl confirms the team member's public name and photograph.
// Chisom's photo comes from her own site, crystalearcounselling.com.
const roles: Role[] = [
  {
    title: 'Director & Operations',
    description: 'Leads the organisation, quality and day-to-day operations.',
    name: 'Team member 01',
    photo: '/images/team/director-operations-stock.webp',
  },
  {
    title: 'Placement Coordination',
    description: 'First contact for referrals, matching and transitions.',
    name: 'Team member 02',
    photo: '/images/team/placement-coordination-stock.webp',
  },
  {
    title: 'Supported Living',
    description: 'Registered management of our supported living homes.',
    name: 'Team member 03',
    photo: '/images/team/role-03.webp',
  },
  {
    title: 'People & Culture',
    description: 'Recruitment, induction, training and supervision.',
    name: 'Team member 04',
    photo: '/images/team/people-culture-stock.webp',
  },
  {
    title: 'Finance & Business',
    description: 'Payroll, invoicing and financial reporting.',
    name: 'Team member 05',
    photo: '/images/team/role-05.webp',
  },
  {
    title: 'Children’s Services',
    description: 'Leads the planned children’s home, subject to Ofsted registration.',
    name: 'Team member 06',
    photo: '/images/team/role-06.webp',
  },
  {
    title: 'Counselling & Wellbeing',
    description: 'Counselling for the people we support, with Chisom.',
    name: 'Chisom',
    photo: '/images/team/chisom.webp',
    position: 'center bottom',
    link: { href: 'https://crystalearcounselling.com/', label: 'Visit Crystal ’ear Counselling' },
  },
];

export default function TeamRoles() {
  const [selected, setSelected] = useState(0);
  const member = roles[selected];

  return (
    <div className="pc-team-grid">
      <figure
        className="pc-team-photo"
        style={member.position ? ({ '--team-photo-position': member.position } as React.CSSProperties) : undefined}
      >
        <OffsetPhoto
          src={member.photo}
          alt={member.link ? `${member.name}, ${member.title}` : `Reference portrait for ${member.title}`}
          width={1120}
          height={1120}
          outline="right"
          sizes="(max-width: 900px) 100vw, 560px"
          priority
        />
        <figcaption aria-live="polite" aria-atomic="true">
          <strong>{member.name}</strong>
          <small>{member.title}</small>
          <small className="pc-team-selected-description">{member.description}</small>
          {member.link ? (
            <div className="pc-team-link">
              <ArrowLink href={member.link.href} external>
                {member.link.label}
              </ArrowLink>
            </div>
          ) : null}
        </figcaption>
      </figure>
      <ul className="pc-roles" aria-label="Team roles">
        {roles.map((role, index) => (
          <li key={role.title}>
            <button
              type="button"
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <strong>{role.title}</strong>
              <small>{role.description}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
