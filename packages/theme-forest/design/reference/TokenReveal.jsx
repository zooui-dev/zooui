import React from "react";
import { Button } from "./Button.jsx";
/** The shown-once moment. Dark panel, teal edge, the secret selectable as one run. Blurs after acknowledgment if requireAck. */
export function TokenReveal({ token, name = "default", onCopy, onAck, ackLabel = "I have saved it" }) {
  const [copied, setCopied] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const copy = () => { try { navigator.clipboard && navigator.clipboard.writeText(token); } catch (e) {} setCopied(true); onCopy && onCopy(token); };
  return (
    <div className="ui-token">
      <div className="kicker">[ token · {name} · shown once ]</div>
      <div className="secret" style={hidden ? { filter: "blur(6px)", userSelect: "none" } : undefined}>{token}</div>
      <div className="note">Anyone holding this can read the feed. We don't store it in a recoverable form — if you lose it, revoke it and create another.</div>
      <div className="acts">
        <Button variant="primary" onClick={copy}>{copied ? "Copied" : "Copy token"}</Button>
        {onAck && <Button variant="secondary" onClick={() => { setHidden(true); onAck(); }}>{ackLabel}</Button>}
      </div>
    </div>
  );
}
