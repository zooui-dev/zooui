import React from "react";
/** Dense rows with optional expansion. columns: [{key,label,num,width,render}]. rows: objects with an id. renderDetail(row) enables a chevron + expandable detail row. */
export function DataTable({ columns = [], rows = [], dense = false, renderDetail, onRowClick, defaultOpen = [], emptyText = "Nothing here yet." }) {
  const [open, setOpen] = React.useState(() => new Set(defaultOpen));
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandable = typeof renderDetail === "function";
  return (
    <table className="ui-table" data-dense={dense ? "true" : undefined}>
      <thead><tr>{expandable && <th style={{ width: 22, padding: "0 0 0 12px" }} />}{columns.map((c) => <th key={c.key} className={c.num ? "num" : undefined} style={{ width: c.width }}>{c.label}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={columns.length + (expandable ? 1 : 0)} style={{ color: "var(--fg-muted)", height: 56 }}>{emptyText}</td></tr>}
        {rows.map((r) => {
          const isOpen = open.has(r.id);
          return (
            <React.Fragment key={r.id}>
              <tr data-expandable={expandable ? "true" : undefined} data-clickable={onRowClick ? "true" : undefined} data-open={isOpen ? "true" : undefined} onClick={() => { if (expandable) toggle(r.id); else if (onRowClick) onRowClick(r); }}>
                {expandable && <td style={{ padding: "0 0 0 12px" }}><span className="chev">›</span></td>}
                {columns.map((c) => <td key={c.key} className={c.num ? "num" : undefined}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
              {expandable && isOpen && <tr className="detail"><td colSpan={columns.length + 1}>{renderDetail(r)}</td></tr>}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
