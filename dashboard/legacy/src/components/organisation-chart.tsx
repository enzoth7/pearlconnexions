"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { OrgHome, OrgPerson } from "@/lib/organisation";
import { chartTree, layoutChart, type ChartNode, type PlacedNode } from "@/lib/organisation-layout";
import "./organisation-chart.css";

// Area colours appear only on the area labels and house names, never as card borders.
const areaColours: Record<string, string> = {
  "childrens-home": "#b45309",
  "supported-living": "#0f766e",
  "business-development": "#0369a1",
  "supported-accommodation": "#7c3aed",
  finance: "#1d4ed8",
  hr: "#be185d",
  office: "#475569",
  other: "#475569",
};

function Box({ node }: { node: PlacedNode }) {
  const style = { left: node.x, top: node.y, width: node.w, height: node.h, "--org-area-colour": areaColours[node.area ?? "other"] } as CSSProperties;
  if (node.kind === "area" || node.kind === "group") {
    return <div className={`org-node org-label${node.kind === "group" ? " org-label--group" : ""}`} style={style}>
      {node.kind === "area" ? <h2 className="org-label-text">{node.label}</h2> : <strong className="org-label-text">{node.label}</strong>}
    </div>;
  }
  if (node.kind === "house") {
    return <div className="org-node org-card org-card--house" style={style}>
      <small className="org-house-name">{node.detail}</small>
      <strong className="org-card-name">{node.label}</strong>
    </div>;
  }
  return <div className={`org-node org-card${node.kind === "director" ? " org-card--director" : ""}`} style={style}>
    <strong className="org-card-name">{node.label}</strong>
    {node.detail && <small className="org-card-detail">{node.detail}</small>}
  </div>;
}

/** Narrow screens: the same tree as an indented outline. */
function Outline({ node, shared }: { node: ChartNode; shared: Map<string, { node: ChartNode; home: string }[]> }) {
  const colour = { "--org-area-colour": areaColours[node.area ?? "other"] } as CSSProperties;
  const label = node.kind === "area" || node.kind === "group"
    ? <strong className={`org-label-text${node.kind === "group" ? " org-outline-group" : ""}`} style={colour}>{node.label}</strong>
    : <div className={`org-card org-outline-card${node.kind === "director" ? " org-card--director" : ""}`} style={colour}>
        {node.kind === "house" && <small className="org-house-name">{node.detail}</small>}
        <strong className="org-card-name">{node.label}</strong>
        {node.kind !== "house" && node.detail && <small className="org-card-detail">{node.detail}</small>}
      </div>;
  const linked = shared.get(node.id) ?? [];
  return <li className="org-outline-item">{label}{(node.children.length > 0 || linked.length > 0) && <ul className="org-outline">
    {node.children.map(child => <Outline key={child.id} node={child} shared={shared} />)}
    {linked.map(item => <li key={item.node.id} className="org-outline-item"><div className="org-card org-outline-card"><strong className="org-card-name">{item.node.label}</strong><small className="org-card-detail">Also in {item.home}</small></div></li>)}
  </ul>}</li>;
}

export function OrganisationChart({ people, homes = [] }: { people: OrgPerson[]; homes?: OrgHome[] }) {
  const visible = people.filter(person => person.include_in_org_chart !== false);
  const { root, extra } = chartTree(visible, homes);
  const chart = layoutChart(root, extra);
  // Fit the chart to the available width instead of scrolling sideways.
  const frame = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(chart.width);
  useEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(1, available / chart.width);
  const narrow = available < 640;
  // Outline view: people with a second area are listed under it too, pointing to their main area.
  const shared = new Map<string, { node: ChartNode; home: string }[]>();
  for (const link of extra) {
    const home = root.children.find(area => area.children.some(child => child.id === link.to));
    const person = home?.children.find(child => child.id === link.to);
    if (home && person) shared.set(link.from, [...(shared.get(link.from) ?? []), { node: person, home: home.label }]);
  }

  return <div className="org-page">
    <header className="workspace-heading"><h1>Organisation chart</h1></header>
    {visible.length ? <div ref={frame} className="org-chart-frame" role="region" aria-label="Team responsibilities by area" style={{ height: narrow ? undefined : chart.height * scale }}>
      {narrow ? <ul className="org-outline org-outline--root"><Outline node={root} shared={shared} /></ul> : <div className="org-chart" style={{ width: chart.width, height: chart.height, transform: `translateX(-50%) scale(${scale})` }}>
        <svg className="org-lines" width={chart.width} height={chart.height} aria-hidden="true">
          {chart.edges.map((edge, index) => <path key={index} d={edge.d} className={edge.secondary ? "org-line org-line--secondary" : "org-line"} />)}
        </svg>
        {chart.nodes.map(node => <Box key={node.id} node={node} />)}
      </div>}
    </div> : <div className="org-empty">No team members are included in the organisation chart.</div>}
  </div>;
}
