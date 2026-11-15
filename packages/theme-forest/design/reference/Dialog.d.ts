import * as React from "react";
export interface DialogProps { open?: boolean; title?: React.ReactNode; tone?: "danger"; onClose?: () => void; actions?: React.ReactNode; /** render without backdrop (for specimens) */ inline?: boolean; children?: React.ReactNode; }
export declare function Dialog(props: DialogProps): JSX.Element;
