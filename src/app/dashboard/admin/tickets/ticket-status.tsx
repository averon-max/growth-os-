"use client";
import { useState } from "react";

export default function TicketStatus({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status);
  async function change(next: string) {
    setValue(next);
    await fetch("/api/admin/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: next }) });
  }
  const color = value === "open" ? "var(--warning)" : value === "pending" ? "var(--accent)" : "var(--muted)";
  return (
    <select value={value} onClick={(e) => e.stopPropagation()} onChange={(e) => change(e.target.value)}
      style={{ height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", color, fontSize: 12.5, padding: "0 6px" }}>
      <option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option>
    </select>
  );
}
