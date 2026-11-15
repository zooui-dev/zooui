import React from "react";
export function Card({ kicker, title, elevation, children, footer, style }) {
  return (
    <section className="ui-card" data-elev={elevation} style={style}>
      {kicker && <div className="kicker">{kicker}</div>}
      {title && <div className="title">{title}</div>}
      {children}
      {footer && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>{footer}</div>}
    </section>
  );
}
