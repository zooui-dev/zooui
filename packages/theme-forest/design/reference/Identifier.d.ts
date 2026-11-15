import * as React from "react";
export interface IdentifierProps { kind?: "package" | "version" | "hash" | "plain"; title?: string; children?: React.ReactNode; }
export declare function Identifier(props: IdentifierProps): JSX.Element;
