import React from "react";
import { Segmented } from "./Segmented.jsx";
/** Three-state theme control. Writes data-theme on <html> ("light" | "dark" | "system" → attribute removed) and persists to localStorage("zoo-theme"). */
export function ThemeToggle({ value, onChange, storageKey = "zoo-theme" }) {
  const [internal, setInternal] = React.useState(() => {
    try { return value || localStorage.getItem(storageKey) || "system"; } catch (e) { return value || "system"; }
  });
  const current = value ?? internal;
  React.useEffect(() => {
    const root = document.documentElement;
    if (current === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", current);
    try { localStorage.setItem(storageKey, current); } catch (e) {}
  }, [current, storageKey]);
  const set = (v) => { setInternal(v); onChange && onChange(v); };
  return <Segmented ariaLabel="Theme" value={current} onChange={set} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} />;
}
