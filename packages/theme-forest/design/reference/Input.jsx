import React from "react";
export function Input({ label, hint, error, mono = false, id, ...rest }) {
  const uid = id || React.useId();
  const control = <input id={uid} className="ui-input" data-mono={mono ? "true" : undefined} aria-invalid={error ? "true" : undefined} {...rest} />;
  if (!label && !hint && !error) return control;
  return (
    <div className="ui-field">
      {label && <label htmlFor={uid}>{label}</label>}
      {control}
      {(error || hint) && <div className="hint" data-error={error ? "true" : undefined}>{error || hint}</div>}
    </div>
  );
}
