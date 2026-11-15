import * as React from "react";
export interface TabsProps { tabs: (string | { value: string; label: string; count?: number })[]; value?: string; onChange?: (v: string) => void; }
export declare function Tabs(props: TabsProps): JSX.Element;
