import React from "react";
import { Button } from "./Button.jsx";
export function Dialog({ open = true, title, children, tone, onClose, actions, inline = false }) {
  if (!open) return null;
  const box = (
    <div className="ui-dialog" role="dialog" aria-modal="true" data-tone={tone}>
      {title && <div className="title">{title}</div>}
      {children}
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
  if (inline) return box;
  return <div className="ui-dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>{box}</div>;
}
