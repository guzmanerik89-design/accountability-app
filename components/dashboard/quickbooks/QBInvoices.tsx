"use client";
import { useState } from "react";
import { deriveInvoiceStatus, formatCurrency } from "@/lib/quickbooks/parsers";
import { format } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function QBInvoices({ payload }: { payload: any }) {
  const [filter, setFilter] = useState<"all" | "Paid" | "Open" | "Overdue">("all");

  if (!payload) return (
    <div className="text-center py-8 text-slate-400 text-sm">
      No invoice data — click <strong>Sync Now</strong> to load
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices: any[] = payload?.QueryResponse?.Invoice ?? [];

  const enriched = invoices.map((inv) => ({
    ...inv,
    status: deriveInvoiceStatus(parseFloat(inv.Balance ?? "0"), inv.DueDate),
  }));

  const filtered = filter === "all" ? enriched : enriched.filter((i) => i.status === filter);

  const totals = {
    all: enriched.length,
    Open: enriched.filter((i) => i.status === "Open").length,
    Overdue: enriched.filter((i) => i.status === "Overdue").length,
    Paid: enriched.filter((i) => i.status === "Paid").length,
  };

  const totalAR = enriched.filter((i) => i.status !== "Paid").reduce((s, i) => s + parseFloat(i.Balance ?? "0"), 0);

  const statusStyle: Record<string, string> = {
    Paid: "bg-green-100 text-green-700",
    Open: "bg-blue-100 text-blue-700",
    Overdue: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(["all", "Open", "Overdue", "Paid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                filter === f
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "All" : f} ({f === "all" ? totals.all : totals[f]})
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold text-red-700">
          AR Outstanding: {formatCurrency(totalAR)}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Invoice #</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Customer</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500">Date</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500">Due Date</th>
              <th className="text-right px-3 py-2.5 font-medium text-slate-500">Amount</th>
              <th className="text-right px-3 py-2.5 font-medium text-slate-500">Balance</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((inv) => (
              <tr key={inv.Id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-slate-700">{inv.DocNumber ?? inv.Id}</td>
                <td className="px-4 py-2 text-slate-700 max-w-[160px] truncate">{inv.CustomerRef?.name ?? "—"}</td>
                <td className="px-3 py-2 text-center text-slate-500">
                  {inv.TxnDate ? format(new Date(inv.TxnDate), "MM/dd/yy") : "—"}
                </td>
                <td className="px-3 py-2 text-center text-slate-500">
                  {inv.DueDate ? format(new Date(inv.DueDate), "MM/dd/yy") : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">{formatCurrency(inv.TotalAmt)}</td>
                <td className={`px-3 py-2 text-right font-mono font-semibold ${parseFloat(inv.Balance) > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(inv.Balance)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle[inv.status]}`}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400">No invoices found</div>
        )}
      </div>
    </div>
  );
}
