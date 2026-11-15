import * as React from "react";
/** @startingPoint section="Forest" subtitle="Over-quota / suspended notice" viewport="640x120" */
export interface BannerProps { tone?: "info" | "warn" | "danger"; title?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; }
export declare function Banner(props: BannerProps): JSX.Element;
