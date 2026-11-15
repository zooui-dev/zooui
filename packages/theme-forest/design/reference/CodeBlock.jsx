import React from "react";
import { Button } from "./Button.jsx";
/** Code in three sizes: variant="inline" (a <code>), "line" (one copyable command with a $ prompt), "block" (multi-line config). Highlights the feed token when `token` is given. */
export function CodeBlock({ variant = "line", code = "", token, lang, wrap = true, prompt = "$", copyLabel = "Copy", onCopy }) {
  const [done, setDone] = React.useState(false);
  if (variant === "inline") return <code className="ui-ident">{code}</code>;
  const copy = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(code); } catch (e) {}
    setDone(true); onCopy && onCopy(code); setTimeout(() => setDone(false), 1600);
  };
  const render = (text) => {
    if (!token || !text.includes(token)) return text;
    const parts = text.split(token);
    return parts.flatMap((p, i) => (i < parts.length - 1 ? [p, <span key={i} className="tok">{token}</span>] : [p]));
  };
  return (
    <div className="ui-code" data-wrap={wrap ? "true" : undefined}>
      {lang && <span className="lang">{lang}</span>}
      {variant === "line" && prompt && <span className="prompt">{prompt}</span>}
      <pre>{render(code)}</pre>
      <button type="button" className="copy" data-done={done ? "true" : undefined} onClick={copy}>{done ? "Copied" : copyLabel}</button>
    </div>
  );
}
