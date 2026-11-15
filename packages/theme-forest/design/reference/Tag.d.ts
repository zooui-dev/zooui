import * as React from "react";
export interface TagProps { tone?: "neutral" | "accent" | "warn" | "danger" | "dark"; mono?: boolean; children?: React.ReactNode; }
export declare function Tag(props: TagProps): JSX.Element;
