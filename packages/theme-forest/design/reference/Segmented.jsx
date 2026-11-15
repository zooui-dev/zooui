import React from "react";
export function Segmented({ options = [], value, onChange, ariaLabel }) {
  return (
    <div className="ui-seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return <button key={opt.value} type="button" aria-pressed={value === opt.value ? "true" : "false"} onClick={() => onChange && onChange(opt.value)}>{opt.icon}{opt.label}</button>;
      })}
    </div>
  );
}
