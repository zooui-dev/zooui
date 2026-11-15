import * as React from "react";
export interface QuotaMeterProps { used: number; quota: number; unit?: string; size?: "md" | "lg"; showValue?: boolean; /** 0–1, default 0.8 */ warnAt?: number; format?: (used: number, quota: number) => string; }
export declare function QuotaMeter(props: QuotaMeterProps): JSX.Element;
