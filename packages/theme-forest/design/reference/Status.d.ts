import * as React from "react";
export interface StatusProps { state: "healthy" | "warn" | "suspended" | "unreachable" | "quiet"; pill?: boolean; children?: React.ReactNode; }
export declare function Status(props: StatusProps): JSX.Element;
