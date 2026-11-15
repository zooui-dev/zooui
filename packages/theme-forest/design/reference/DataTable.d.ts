import * as React from "react";
export interface DataTableColumn<T = any> { key: string; label: string; num?: boolean; width?: number | string; render?: (row: T) => React.ReactNode; }
export interface DataTableProps<T = any> { columns: DataTableColumn<T>[]; rows: (T & { id: string })[]; dense?: boolean; renderDetail?: (row: T) => React.ReactNode; onRowClick?: (row: T) => void; defaultOpen?: string[]; emptyText?: string; }
export declare function DataTable(props: DataTableProps): JSX.Element;
