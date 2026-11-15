import React from "react";
export function Button({ variant = "secondary", size = "md", icon, iconOnly = false, disabled, children, as = "button", href, onClick, type = "button", title }) {
  const Tag = as === "a" ? "a" : "button";
  return (
    <Tag className="ui-btn" data-variant={variant} data-size={size} data-icon={iconOnly ? "true" : undefined} disabled={disabled} href={href} onClick={onClick} type={Tag === "button" ? type : undefined} title={title} aria-label={iconOnly && typeof children === "string" ? children : undefined}>
      {icon}{!iconOnly && children}
    </Tag>
  );
}
