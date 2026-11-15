import React from "react";
export function Tabs({ tabs = [], value, onChange }) {
  return (
    <div className="ui-tabs" role="tablist">
      {tabs.map((t) => {
        const tab = typeof t === "string" ? { value: t, label: t } : t;
        return <button key={tab.value} role="tab" aria-selected={value === tab.value ? "true" : "false"} onClick={() => onChange && onChange(tab.value)}>{tab.label}{tab.count != null && <span style={{ marginLeft: 6, font: "var(--type-code-sm)", color: "var(--fg-subtle)" }}>{tab.count}</span>}</button>;
      })}
    </div>
  );
}
