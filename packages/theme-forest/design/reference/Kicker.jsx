import React from "react";
export function Kicker({ children, as = "div" }) { const T = as; return <T className="ui-kicker">{children}</T>; }
