import React from "react";
export function Tag({ tone = "neutral", children, mono = true }) {
  return <span className="ui-tag" data-tone={tone} style={mono ? undefined : { fontFamily: "var(--font-sans)" }}>{children}</span>;
}
