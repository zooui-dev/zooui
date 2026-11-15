import React from "react";
export function Toast({ tone = "ok", children, action, onAction }) {
  return <div className="ui-toast" data-tone={tone} role="status">{children}{action && <button type="button" className="act" onClick={onAction}>{action}</button>}</div>;
}
