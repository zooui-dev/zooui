import React from "react";
/** Storage against quota. Level is derived: <80% normal, 80–99% warn (amber), ≥100% over (red, hatched). warnAt overrides the threshold. */
export function QuotaMeter({ used = 0, quota = 1, unit = "GB", size = "md", showValue = true, warnAt = 0.8, format }) {
  const ratio = quota > 0 ? used / quota : 0;
  const level = ratio >= 1 ? "over" : ratio >= warnAt ? "warn" : "ok";
  const pct = Math.min(100, Math.round(ratio * 100));
  const fmt = format || ((u, q) => `${+u.toFixed(u < 10 ? 1 : 0)} / ${q} ${unit}`);
  return (
    <span className="ui-meter" data-level={level} data-size={size} data-hatch={level === "over" ? "true" : undefined} role="meter" aria-valuemin={0} aria-valuemax={quota} aria-valuenow={used} aria-label={`${fmt(used, quota)}`}>
      <span className="track"><span className="fill" style={{ width: pct + "%" }} />{warnAt < 1 && <span className="mark" style={{ left: warnAt * 100 + "%" }} />}</span>
      {showValue && <span className="value">{fmt(used, quota)}</span>}
    </span>
  );
}
