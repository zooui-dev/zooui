import * as React from "react";
export interface SegmentedProps { options: (string | { value: string; label: string; icon?: React.ReactNode })[]; value?: string; onChange?: (v: string) => void; ariaLabel?: string; }
export declare function Segmented(props: SegmentedProps): JSX.Element;
