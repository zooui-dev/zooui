import * as React from "react";
export interface NavProps { links?: { label: string; href?: string; current?: boolean }[]; right?: React.ReactNode; brandHref?: string; product?: string; }
export declare function Nav(props: NavProps): JSX.Element;
