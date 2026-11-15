import * as React from "react";
export interface ButtonProps { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; icon?: React.ReactNode; iconOnly?: boolean; disabled?: boolean; as?: "button" | "a"; href?: string; type?: "button" | "submit"; title?: string; onClick?: () => void; children?: React.ReactNode; }
export declare function Button(props: ButtonProps): JSX.Element;
