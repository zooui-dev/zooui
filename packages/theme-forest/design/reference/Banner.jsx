import React from "react";
/** Page-level notice with a hatched edge. tone = "info" | "warn" | "danger". Used for over-quota, suspended, payment failed. */
export function Banner({ tone = "info", title, children, actions, icon }) {
  return (
    <div className="ui-banner" data-tone={tone} role={tone === "danger" ? "alert" : "status"}>
      <div style={{ width: 4 }} />
      <div className="body">{title && <div className="title">{title}</div>}{children && <p>{children}</p>}</div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
