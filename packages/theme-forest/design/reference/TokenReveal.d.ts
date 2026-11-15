import * as React from "react";
/** @startingPoint section="Forest" subtitle="The token-shown-once panel" viewport="560x220" */
export interface TokenRevealProps { token: string; name?: string; onCopy?: (t: string) => void; onAck?: () => void; ackLabel?: string; }
export declare function TokenReveal(props: TokenRevealProps): JSX.Element;
