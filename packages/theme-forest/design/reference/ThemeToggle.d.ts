import * as React from "react";
export interface ThemeToggleProps { value?: "light" | "dark" | "system"; onChange?: (v: "light" | "dark" | "system") => void; storageKey?: string; }
export declare function ThemeToggle(props: ThemeToggleProps): JSX.Element;
