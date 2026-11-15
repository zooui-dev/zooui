import React from "react";
const LABELS = { healthy: "Healthy", warn: "Near limit", suspended: "Suspended", unreachable: "Unreachable", quiet: "Quiet" };
/** Status with a shape per state (circle, triangle, square, dashed ring, hollow ring) so it never relies on color alone. */
export function Status({ state = "healthy", children, pill = false }) {
  return <span className="ui-status" data-state={state} data-pill={pill ? "true" : undefined}><span className="glyph" aria-hidden="true" />{children ?? LABELS[state]}</span>;
}
Status.STATES = Object.keys(LABELS);
