import * as React from "react";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string; /** monospace value (tokens, URLs, ids) */ mono?: boolean; }
export declare function Input(props: InputProps): JSX.Element;
