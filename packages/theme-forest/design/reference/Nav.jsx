import React from "react";
/** The header bar. links: [{label, href, current}] */
export function Nav({ links = [], right, brandHref = "#", product }) {
  return (
    <nav className="ui-nav">
      <a className="brand" href={brandHref}><span className="br">[</span><span className="wm">zoo</span><span className="br">]</span>{product && <span style={{ marginLeft: 8, font: "var(--type-kicker)", color: "var(--fg-muted)" }}>{product}</span>}</a>
      <div className="links">{links.map((l) => <a key={l.label} href={l.href || "#"} aria-current={l.current ? "page" : undefined}>{l.label}</a>)}</div>
      <div className="right">{right}</div>
    </nav>
  );
}
