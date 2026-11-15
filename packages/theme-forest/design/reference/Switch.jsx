import React from "react";
export function Switch({ checked = false, onChange, disabled, label }) {
  const btn = <button type="button" role="switch" className="ui-switch" aria-checked={checked ? "true" : "false"} disabled={disabled} onClick={() => onChange && onChange(!checked)} aria-label={label} />;
  if (!label) return btn;
  return <label style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "var(--type-body-sm)", cursor: disabled ? "not-allowed" : "pointer" }}>{btn}<span>{label}</span></label>;
}
