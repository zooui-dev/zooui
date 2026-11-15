import React from "react";
/** A literal string people paste: package id, version, hash, URL. Always monospace. kind = "package" | "version" | "hash" | "plain". */
export function Identifier({ kind = "package", children, title }) {
  return <span className="ui-ident" data-kind={kind} title={title}>{children}</span>;
}
