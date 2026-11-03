import type { CSSProperties } from "react";
import { organisationByArea, organisationRole, type OrganisationNode, type OrgPerson } from "@/lib/organisation";
import "./organisation-chart.css";

export function OrganisationChart({ people }: { people: OrgPerson[] }) {
  const { directors, areas, visible } = organisationByArea(people);
  function personCard(person: OrgPerson, leadership = false) {
    return <div className={`org-person${leadership ? " org-person--director" : ""}`}>
      <strong className="org-person-name">{person.name}</strong>
      <span className="org-person-role">{leadership ? person.role_title || "Director" : organisationRole(person)}</span>
    </div>;
  }

  function personBranch(person: OrganisationNode): React.ReactNode {
    return <li key={person.id} className="org-person-branch">
      {personCard(person)}
      {person.children.length > 0 && <ul className="org-direct-reports" aria-label={`Direct reports of ${person.name}`}>
        {person.children.map(personBranch)}
      </ul>}
    </li>;
  }

  return <div className="org-page">
    <header className="workspace-heading"><h1>Organisation chart</h1></header>
      <div className="org-chart-scroll" role="region" aria-label="Team responsibilities by area" tabIndex={0}>
        <div className={`org-chart${areas.length ? " org-chart--connected" : ""}`}
          style={{ "--org-area-count": Math.max(areas.length, 1) } as CSSProperties}>
          <div className="org-leadership">
            {directors.length ? directors.map(person => <div key={person.id}>{personCard(person, true)}</div>) :
              <div className="org-person org-person--director"><strong className="org-person-name">Pearl Connexions</strong><span className="org-person-role">Team</span></div>}
          </div>
          {areas.length > 0 && <div className="org-areas">
            {areas.map(area => <section className="org-area" key={area.id} aria-labelledby={`org-area-${area.id}`}>
              <h2 className="org-area-name" id={`org-area-${area.id}`}>{area.label}</h2>
              <ul className="org-area-people">
                {area.people.map(personBranch)}
              </ul>
            </section>)}
          </div>}
          {!visible.length && <p className="org-empty">No team members are included in the organisation chart.</p>}
        </div>
      </div>

  </div>;
}
