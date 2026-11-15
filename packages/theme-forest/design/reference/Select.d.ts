import * as React from "react";
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; hint?: string; options: (string | { value: string; label: string; disabled?: boolean })[]; }
export declare function Select(props: SelectProps): JSX.Element;
