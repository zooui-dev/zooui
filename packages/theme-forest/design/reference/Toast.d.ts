import * as React from "react";
export interface ToastProps { tone?: "ok" | "warn" | "danger"; action?: string; onAction?: () => void; children?: React.ReactNode; }
export declare function Toast(props: ToastProps): JSX.Element;
