import React from "react";
const ECO = {
  npm: { abbr: "npm", label: "npm" },
  nuget: { abbr: "nu", label: "NuGet" },
  winget: { abbr: "wg", label: "winget" },
  chocolatey: { abbr: "ch", label: "Chocolatey" },
  scoop: { abbr: "sc", label: "Scoop" },
  homebrew: { abbr: "br", label: "Homebrew" },
};
/** Six package managers as monogram tiles. Each ecosystem has its own corner shape so they read apart at 20px without brand colors. */
export function EcosystemMark({ ecosystem = "npm", size = "sm", withLabel = false, soon }) {
  const e = ECO[ecosystem] || { abbr: ecosystem.slice(0, 2), label: ecosystem };
  const isSoon = soon ?? e.soon;
  const tile = <span className="ui-eco" data-eco={ecosystem} data-size={size} data-soon={isSoon ? "true" : undefined} title={e.label + (isSoon ? " (coming)" : "")} aria-label={e.label}>{e.abbr}</span>;
  if (!withLabel) return tile;
  return <span className="ui-eco-wrap">{tile}<span style={{ color: isSoon ? "var(--fg-muted)" : undefined }}>{e.label}{isSoon && <span style={{ color: "var(--fg-subtle)" }}> · soon</span>}</span></span>;
}
EcosystemMark.ECOSYSTEMS = Object.keys(ECO);
