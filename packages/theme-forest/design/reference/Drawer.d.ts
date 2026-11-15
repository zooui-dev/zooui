import * as React from "react";
export interface DrawerProps { open?: boolean; title?: React.ReactNode; footer?: React.ReactNode; onClose?: () => void; inline?: boolean; children?: React.ReactNode; }
export declare function Drawer(props: DrawerProps): JSX.Element;
