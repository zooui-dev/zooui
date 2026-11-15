import React from "react";
export function Drawer({ open = true, title, children, footer, onClose, inline = false }) {
  if (!open) return null;
  const panel = (
    <div className="ui-drawer" role="dialog" aria-modal="true">
      <div className="head"><span>{title}</span>{onClose && <button type="button" className="ui-btn" data-variant="ghost" data-size="sm" data-icon="true" onClick={onClose} aria-label="Close">×</button>}</div>
      <div className="body">{children}</div>
      {footer && <div className="foot">{footer}</div>}
    </div>
  );
  if (inline) return panel;
  return <div className="ui-drawer-backdrop" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>{panel}</div>;
}
