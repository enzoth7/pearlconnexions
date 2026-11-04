import type { CaseRecord, Person } from "./qa-capture";

export type Recurrence = {
  key: string;
  person: string;
  homeId: string;
  incidents: CaseRecord[];
  types: string[];
  latest: string;
  openFollowUps: number;
};

export function buildRecurrences(records: CaseRecord[], people: Person[]): Recurrence[] {
  const byId = new Map(people.map(person => [person.id, person]));
  const groups = new Map<string, Recurrence>();

  for (const incident of records) {
    if (incident.kind !== "incidents" || incident.is_draft) continue;
    const identities = incident.data.person_ids.length
      ? incident.data.person_ids.map((id, index) => ({ key: `id:${id}`, name: byId.get(id)?.alias ?? incident.data.person_name.split(/\r?\n/)[index]?.trim() ?? "Person" }))
      : incident.data.involvement === "identified"
        ? incident.data.person_name.split(/\r?\n/).map(name => name.trim()).filter(Boolean).map(name => ({ key: `name:${name.toLocaleLowerCase("en-GB")}`, name }))
        : [];
    for (const identity of new Map(identities.map(item => [item.key, item])).values()) {
      const key = `${incident.home_id}|${identity.key}`;
      let group = groups.get(key);
      if (!group) {
        group = { key, person: identity.name, homeId: incident.home_id, incidents: [], types: [], latest: "", openFollowUps: 0 };
        groups.set(key, group);
      }
      group.incidents.push(incident);
      if (incident.data.category && !group.types.includes(incident.data.category)) group.types.push(incident.data.category);
      if (incident.occurred_on > group.latest) group.latest = incident.occurred_on;
      if (incident.status !== "Closed") group.openFollowUps += 1;
    }
  }

  return [...groups.values()].filter(group => group.incidents.length >= 2).map(group => ({
    ...group,
    incidents: group.incidents.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    types: group.types.sort(),
  })).sort((a, b) => b.incidents.length - a.incidents.length || b.latest.localeCompare(a.latest) || a.person.localeCompare(b.person));
}
