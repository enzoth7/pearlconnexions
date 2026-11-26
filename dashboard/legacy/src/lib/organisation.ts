export type OrgPerson={id:string;name:string;role_title:string|null;parent_manager_id:string|null;include_in_org_chart?:boolean;director?:boolean};
export function organisationGroups(people:OrgPerson[]){
 const visible=people.filter(person=>person.include_in_org_chart!==false);const ids=new Set(visible.map(p=>p.id));
 return {visible,roots:visible.filter(p=>p.director&&!p.parent_manager_id),unassigned:visible.filter(p=>!p.director&&(!p.parent_manager_id||!ids.has(p.parent_manager_id)))};
}

export type OrganisationNode = OrgPerson & { children: OrganisationNode[]; house?: string };
export type OrganisationArea = { id: string; label: string; people: OrganisationNode[]; houses: OrganisationNode[] };
/** The home a team member manages (from team_chart_homes). */
export type OrgHome = { manager_id: string; home_name: string; provision: string };

// Responsibilities from the supplied team reference; names and visibility come from real accounts.
const referenceRoles: Record<string, { area: string; role: string }> = {
  "mike wright": { area: "childrens-home", role: "Children’s Home" },
  "renee minott": { area: "supported-living", role: "Business Development · Supported Living" },
  "ruben purmah": { area: "finance", role: "Finance" },
  "shabana haroon": { area: "office", role: "Office Coordinator" },
  "simmone reid": { area: "hr", role: "HR" },
  "zulaikha halim": { area: "supported-living", role: "Supported Living" },
};
const areaDefinitions = [
  ["childrens-home", "Children’s Home"], ["supported-living", "Supported Living"],
  ["supported-accommodation", "Supported Accommodation"], ["finance", "Finance"],
  ["hr", "HR"], ["office", "Office coordination"], ["other", "Team"],
] as const;

function referenceRole(person: OrgPerson) { return referenceRoles[person.name.trim().toLocaleLowerCase("en-GB")]; }

export function organisationRole(person: OrgPerson) {
  return referenceRole(person)?.role || person.role_title || (person.director ? "Director" : "Team member");
}

const provisionArea: Record<string, string> = {
  "Supported Living": "supported-living",
  "Supported Accommodation": "supported-accommodation",
  "Children's Home": "childrens-home",
};

export function organisationByArea(people: OrgPerson[], homes: OrgHome[] = []) {
  const homeByManager = new Map(homes.map(home => [home.manager_id, home]));
  const visible = people.filter(person => person.include_in_org_chart !== false);
  const directors = visible.filter(person => person.director);
  const nodes = new Map(visible.filter(person => !person.director).map(person => [person.id, { ...person, children: [] } as OrganisationNode]));
  const roots: OrganisationNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_manager_id ? nodes.get(node.parent_manager_id) : undefined;
    const visited = new Set([node.id]);
    let ancestor = parent;
    while (ancestor && !visited.has(ancestor.id)) {
      visited.add(ancestor.id);
      ancestor = ancestor.parent_manager_id ? nodes.get(ancestor.parent_manager_id) : undefined;
    }
    // A missing/hidden manager or a malformed cycle must not make a person disappear.
    if (parent && !ancestor) parent.children.push(node);
    else roots.push(node);
  }
  const areas: OrganisationArea[] = areaDefinitions.map(([id, label]) => ({ id, label, people: [], houses: [] }));
  for (const person of roots) {
    // House managers sit under the service their house provides.
    const home = referenceRole(person) ? undefined : homeByManager.get(person.id);
    if (home && provisionArea[home.provision]) {
      areas.find(item => item.id === provisionArea[home.provision])!.houses.push({ ...person, house: home.home_name });
      continue;
    }
    const role = (person.role_title ?? "").toLowerCase();
    const area = referenceRole(person)?.area ?? (
      role.includes("finance") ? "finance" : role.includes("office") ? "office" :
      /\bhr\b|human resources/.test(role) ? "hr" : role.includes("accommodation") ? "supported-accommodation" :
      role.includes("children") ? "childrens-home" : role.includes("supported living") ? "supported-living" : "other"
    );
    areas.find(item => item.id === area)!.people.push(person);
  }
  for (const area of areas) area.houses.sort((a, b) => (a.house ?? "").localeCompare(b.house ?? ""));
  return { directors, areas: areas.filter(area => area.people.length || area.houses.length), visible };
}
