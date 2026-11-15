import React from "react";
export function Tooltip({ label, children, open }) {
  return <span className="ui-tip" data-open={open ? "true" : undefined} tabIndex={0}>{children}<span className="bubble" role="tooltip">{label}</span></span>;
}
