import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OrganisationChart } from "./organisation-chart";
import { organisationByArea, organisationRole, type OrgPerson } from "@/lib/organisation";

const person = (name: string, extra: Partial<OrgPerson> = {}): OrgPerson => ({
  id: name.toLowerCase().replaceAll(" ", "-"), name, role_title: null, parent_manager_id: null, ...extra,
});
const people = [
  person("Joel Samuel", { director: true, role_title: "Director" }), person("Mike Wright"),
  person("Renee Minott"), person("Richard Ayodele"), person("Ruben Purmah"),
  person("Shabana Haroon", { parent_manager_id: "simmone-reid" }), person("Simmone Reid"), person("Zulaikha Halim"),
  person("Test User", { include_in_org_chart: false }),
];
afterEach(cleanup);

describe("organisation by area", () => {
  it("groups the team in five branches, with Shabana reporting to Simmone", () => {
    const result = organisationByArea(people);
    expect(result.directors.map(p => p.name)).toEqual(["Joel Samuel"]);
    expect(result.areas).toHaveLength(5);
    expect(result.areas.find(area => area.id === "supported-living")?.people.map(p => p.name)).toEqual(["Renee Minott", "Zulaikha Halim"]);
    expect(organisationRole(people[2])).toBe("Business Development · Supported Living");
    expect(result.areas.find(area => area.id === "hr")?.people[0]).toMatchObject({
      name: "Simmone Reid", children: [{ name: "Shabana Haroon", parent_manager_id: "simmone-reid" }],
    });
    expect(result.areas.some(area => area.id === "office")).toBe(false);
    expect(result.visible).toHaveLength(8);
  });
  it("keeps unfamiliar real members and their current reporting relationships", () => {
    const extra = person("New manager", { role_title: "Finance manager", parent_manager_id: "ruben-purmah" });
    const result = organisationByArea([...people, extra]);
    expect(result.areas.find(area => area.id === "finance")?.people[0].children).toEqual([expect.objectContaining(extra)]);
    expect(extra.parent_manager_id).toBe("ruben-purmah");
  });
  it("retains people when their manager is hidden or reporting data contains a cycle", () => {
    const result = organisationByArea([
      person("Hidden manager", { include_in_org_chart: false }),
      person("Visible member", { parent_manager_id: "hidden-manager" }),
      person("First", { parent_manager_id: "second" }),
      person("Second", { parent_manager_id: "first" }),
    ]);
    expect(result.areas.flatMap(area => area.people).map(p => p.name).sort()).toEqual(["First", "Second", "Visible member"]);
  });
});

describe("organisation chart", () => {
  it("shows a read-only team with Shabana below Simmone", () => {
    render(<OrganisationChart people={people} />);
    expect(screen.getByText("Joel Samuel").closest(".org-person")).toHaveClass("org-person--director");
    expect(document.querySelectorAll(".org-person")).toHaveLength(8);
    const hr = screen.getByRole("region", { name: "HR" });
    expect(hr).toContainElement(screen.getByText("Simmone Reid"));
    expect(screen.getByRole("list", { name: "Direct reports of Simmone Reid" })).toContainElement(screen.getByText("Shabana Haroon"));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
  });
});
