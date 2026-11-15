import React from "react";
export function Select({ label, hint, options = [], id, ...rest }) {
  const uid = id || React.useId();
  const control = (
    <select id={uid} className="ui-input ui-select" {...rest}>
      {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>))}
    </select>
  );
  if (!label && !hint) return control;
  return (
    <div className="ui-field">
      {label && <label htmlFor={uid}>{label}</label>}
      {control}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
