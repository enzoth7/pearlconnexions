import { describe, expect, it } from "vitest";
import { organisationByArea, type OrgPerson } from "@/lib/organisation";
import { chartTree, layoutChart } from "@/lib/organisation-layout";

const person = (name: string, extra: Partial<OrgPerson> = {}): OrgPerson => ({
  id: name.toLowerCase().replaceAll(" ", "-"), name, role_title: null, parent_manager_id: null, ...extra,
});
const people = [
  person("Joel Samuel", { director: true, role_title: "Director" }), person("Mike Wright", { role_title: "Children home" }),
  person("Renee Minott"), person("Zulaikha Halim"), person("Ruben Purmah"), person("Simmone Reid"),
  person("Shabana Haroon", { role_title: "Office Coordinator", parent_manager_id: "simmone-reid" }),
  person("Chris Frimpong", { role_title: "House Manager · Garnet House" }),
  person("Caiden Forde", { role_title: "House Manager · Hematite House" }),
];
const homes = [
  { manager_id: "chris-frimpong", home_name: "Garnet House", provision: "Supported Living" },
  { manager_id: "caiden-forde", home_name: "Hematite House", provision: "Supported Accommodation" },
];

describe("organisation chart", () => {
  it("places each house manager under the service of their house, not a catch-all group", () => {
    const { areas } = organisationByArea(people, homes);
    expect(areas.find(area => area.id === "supported-living")?.houses.map(h => [h.house, h.name])).toEqual([["Garnet House", "Chris Frimpong"]]);
    expect(areas.find(area => area.id === "supported-accommodation")?.houses.map(h => h.name)).toEqual(["Caiden Forde"]);
    expect(areas.some(area => area.id === "other")).toBe(false);
  });

  it("builds Supported Living as Zulaikha, Houses, Renee, with Business Development also leading to Renee", () => {
    const { root, extra } = chartTree(people, homes);
    expect(root.children.map(area => area.label)).toEqual(["Children’s Home", "Supported Living", "Business Development", "Supported Accommodation", "Finance", "HR"]);
    const living = root.children[1];
    expect(living.children.map(node => node.label)).toEqual(["Zulaikha Halim", "Houses", "Renee Minott"]);
    expect(living.children[1].children.map(node => [node.detail, node.label])).toEqual([["Garnet House", "Chris Frimpong"]]);
    expect(extra).toEqual([{ from: "area-business-development", to: "person-renee-minott" }]);
  });

  it("does not repeat the area name on cards", () => {
    const { root } = chartTree(people, homes);
    expect(root.children[0].children[0]).toMatchObject({ label: "Mike Wright", detail: undefined });
    expect(root.children[1].children[0]).toMatchObject({ label: "Zulaikha Halim", detail: undefined });
    expect(root.children[1].children[2]).toMatchObject({ label: "Renee Minott", detail: "Business Development" });
  });

  it("lays out every node without overlaps and draws the shared line as secondary", () => {
    const { root, extra } = chartTree(people, homes);
    const chart = layoutChart(root, extra);
    const boxes = chart.nodes;
    for (const a of boxes) for (const b of boxes) {
      if (a === b) continue;
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      expect(overlap, `${a.label} overlaps ${b.label}`).toBe(false);
    }
    expect(chart.edges.filter(edge => edge.secondary)).toHaveLength(1);
    expect(boxes.every(box => box.x >= 0 && box.x + box.w <= chart.width)).toBe(true);
  });
});
