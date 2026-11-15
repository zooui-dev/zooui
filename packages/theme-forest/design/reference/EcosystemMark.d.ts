import * as React from "react";
export interface EcosystemMarkProps { ecosystem: "npm" | "nuget" | "winget" | "chocolatey" | "scoop" | "homebrew"; size?: "sm" | "md" | "lg"; withLabel?: boolean; soon?: boolean; }
export declare function EcosystemMark(props: EcosystemMarkProps): JSX.Element;
