import * as React from "react";
export interface CardProps { kicker?: string; title?: React.ReactNode; elevation?: "sm" | "md"; footer?: React.ReactNode; style?: React.CSSProperties; children?: React.ReactNode; }
export declare function Card(props: CardProps): JSX.Element;
