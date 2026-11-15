import * as React from "react";
/** @startingPoint section="Forest" subtitle="Copyable command with token highlight" viewport="640x80" */
export interface CodeBlockProps { variant?: "inline" | "line" | "block"; code: string; /** substring to highlight as the secret */ token?: string; lang?: string; /** default true — long commands wrap rather than scroll */ wrap?: boolean; prompt?: string; copyLabel?: string; onCopy?: (code: string) => void; }
export declare function CodeBlock(props: CodeBlockProps): JSX.Element;
