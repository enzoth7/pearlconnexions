import { organisationByArea, organisationRole, type OrgHome, type OrgPerson } from "@/lib/organisation";

/** One box in the organisation chart. "stack" lays children out as a vertical list under a rail. */
export type ChartNode = {
  id: string;
  kind: "director" | "area" | "person" | "group" | "house";
  label: string;
  detail?: string;
  area?: string;
  stack?: boolean;
  children: ChartNode[];
};
export type PlacedNode = Omit<ChartNode, "children"> & { x: number; y: number; w: number; h: number };
export type ChartEdge = { d: string; secondary?: boolean };

// People who also belong to a second area get a secondary (dashed) line from it.
const sharedAreas: Record<string, { area: string; label: string }> = {
  "renee minott": { area: "business-development", label: "Business Development" },
};
const areaOrder = ["childrens-home", "supported-living", "business-development", "supported-accommodation", "finance", "hr", "office", "other"];

/** Drops what the area label already says, e.g. "Supported Living" under Supported Living. */
function detailFor(person: OrgPerson, areaLabel: string) {
  const role = organisationRole(person);
  const parts = role.split("·").map(part => part.trim()).filter(part => part && part.toLocaleLowerCase("en-GB") !== areaLabel.toLocaleLowerCase("en-GB"));
  return parts.join(" · ") || undefined;
}

export function chartTree(people: OrgPerson[], homes: OrgHome[] = []) {
  const { directors, areas } = organisationByArea(people, homes);
  const extra: { from: string; to: string }[] = [];
  const areaNodes: ChartNode[] = [];
  const toPerson = (person: OrgPerson & { children?: OrgPerson[] }, areaLabel: string, area: string): ChartNode => ({
    id: `person-${person.id}`, kind: "person", label: person.name, detail: detailFor(person, areaLabel), area,
    children: (person.children ?? []).map(child => toPerson(child, areaLabel, area)),
  });

  for (const area of areas) {
    const shared = area.people.filter(person => sharedAreas[person.name.trim().toLocaleLowerCase("en-GB")]);
    const own = area.people.filter(person => !shared.includes(person));
    const children = own.map(person => toPerson(person, area.label, area.id));
    if (area.houses.length) children.push({
      id: `houses-${area.id}`, kind: "group", label: "Houses", area: area.id, stack: true,
      children: area.houses.map(person => ({ id: `house-${person.id}`, kind: "house", label: person.name, detail: person.house, area: area.id, children: [] })),
    });
    children.push(...shared.map(person => toPerson(person, area.label, area.id)));
    areaNodes.push({ id: `area-${area.id}`, kind: "area", label: area.label, area: area.id, children });
    for (const person of shared) {
      const link = sharedAreas[person.name.trim().toLocaleLowerCase("en-GB")];
      if (!areaNodes.some(node => node.id === `area-${link.area}`) && !areas.some(item => item.id === link.area)) {
        areaNodes.push({ id: `area-${link.area}`, kind: "area", label: link.label, area: link.area, children: [] });
      }
      extra.push({ from: `area-${link.area}`, to: `person-${person.id}` });
    }
  }
  areaNodes.sort((a, b) => areaOrder.indexOf(a.area ?? "other") - areaOrder.indexOf(b.area ?? "other"));
  const director = directors[0];
  const root: ChartNode = {
    id: "director", kind: "director", label: director?.name ?? "Pearl Connexions",
    detail: director ? director.role_title || "Director" : "Team", children: areaNodes,
  };
  return { root, extra };
}

const SLOT = 168;
const GAP_Y = 40;
const STACK_GAP = 8;
const sizes: Record<ChartNode["kind"], { w: number; h: number }> = {
  director: { w: 200, h: 62 }, area: { w: 156, h: 28 }, person: { w: 148, h: 56 }, group: { w: 84, h: 24 }, house: { w: 140, h: 48 },
};

/** Places every node and returns orthogonal connector paths, ready to draw. */
export function layoutChart(root: ChartNode, extra: { from: string; to: string }[] = []) {
  const placed = new Map<string, PlacedNode>();
  const edges: ChartEdge[] = [];
  const width = (node: ChartNode): number =>
    node.stack || !node.children.length ? SLOT : node.children.reduce((sum, child) => sum + width(child), 0);

  // Row heights per depth, ignoring stacked children (they hang below their parent).
  const rowHeights: number[] = [];
  (function measure(node: ChartNode, depth: number) {
    rowHeights[depth] = Math.max(rowHeights[depth] ?? 0, sizes[node.kind].h);
    if (!node.stack) node.children.forEach(child => measure(child, depth + 1));
  })(root, 0);
  const rowTop = rowHeights.map((_, depth) => rowHeights.slice(0, depth).reduce((sum, h) => sum + h + GAP_Y, 0));

  function place(node: ChartNode, left: number, depth: number): PlacedNode {
    const { w, h } = sizes[node.kind];
    let cx = left + width(node) / 2;
    const rowChildren: PlacedNode[] = [];
    if (!node.stack && node.children.length) {
      let childLeft = left;
      for (const child of node.children) { rowChildren.push(place(child, childLeft, depth + 1)); childLeft += width(child); }
      cx = (rowChildren[0].x + rowChildren[0].w / 2 + rowChildren.at(-1)!.x + rowChildren.at(-1)!.w / 2) / 2;
    }
    const { children: _children, ...rest } = node;
    const self: PlacedNode = { ...rest, x: cx - w / 2, y: rowTop[depth], w, h };
    placed.set(node.id, self);
    const bottom = self.y + h;

    if (rowChildren.length) {
      const busY = rowTop[depth + 1] - GAP_Y / 2;
      for (const child of rowChildren) edges.push({ d: `M${cx},${bottom}V${busY}H${child.x + child.w / 2}V${child.y}` });
    }
    if (node.stack) {
      let y = bottom + 18;
      const childW = sizes.house.w;
      const childLeft = cx - childW / 2 + 10;
      const railX = childLeft - 12;
      let lastMid = bottom;
      for (const child of node.children) {
        const { h: ch } = sizes[child.kind];
        const { children: _grand, ...childRest } = child;
        placed.set(child.id, { ...childRest, x: childLeft, y, w: childW, h: ch });
        lastMid = y + ch / 2;
        edges.push({ d: `M${railX},${lastMid}H${childLeft}` });
        y += ch + STACK_GAP;
      }
      if (node.children.length) edges.push({ d: `M${cx},${bottom}V${bottom + 9}H${railX}V${lastMid}` });
    }
    return self;
  }

  place(root, 0, 0);
  for (const link of extra) {
    const from = placed.get(link.from);
    const to = placed.get(link.to);
    if (!from || !to) continue;
    const viaY = to.y - 10;
    edges.push({ d: `M${from.x + from.w / 2},${from.y + from.h}V${viaY}H${to.x + to.w / 2}V${to.y}`, secondary: true });
  }
  const nodes = [...placed.values()];
  return {
    nodes,
    edges,
    width: width(root),
    height: Math.max(...nodes.map(node => node.y + node.h)) + 8,
  };
}
