"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/quickbooks/parsers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function QBAccounts({ payload }: { payload: any }) {
  const [typeFilter, setTypeFilter] = useState("all");

  if (!payload) return (
    <div className="text-center py-8 text-slate-400 text-sm">
      No accounts data — click <strong>Sync Now</strong> to load
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts: any[] = payload?.QueryResponse?.Account ?? [];

  const types = ["all", ...Array.from(new Set(accounts.map((a) => a.AccountType)))].sort();
  const filtered = typeFilter === "all" ? accounts : accounts.filter((a) => a.AccountType === typeFilter);

  const typeColors: Record<string, string> = {
    Asset: "bg-blue-100 text-blue-700",
    Liability: "bg-red-100 text-red-700",
    Equity: "bg-purple-100 text-purple-700",
    Income: "bg-green-100 text-green-700",
    Expense: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              typeFilter === t
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t === "all" ? `All (${accounts.length})` : `${t} (${accounts.filter((a) => a.AccountType === t).length})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Account Name</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500">Type</th>
              <th className="text-left px-3 py-2.5 font-medium text-slate-500">Sub-type</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((acc) => (
              <tr key={acc.Id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800">{acc.Name}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeColors[acc.AccountType] ?? "bg-gray-100 text-gray-600"}`}>
                    {acc.AccountType}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{acc.AccountSubType ?? "—"}</td>
                <td className={`px-4 py-2 text-right font-mono font-semibold ${parseFloat(acc.CurrentBalance ?? "0") < 0 ? "text-red-600" : "text-slate-700"}`}>
                  {formatCurrency(acc.CurrentBalance ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
