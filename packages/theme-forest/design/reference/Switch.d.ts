import * as React from "react";
export interface SwitchProps { checked?: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label?: string; }
export declare function Switch(props: SwitchProps): JSX.Element;
