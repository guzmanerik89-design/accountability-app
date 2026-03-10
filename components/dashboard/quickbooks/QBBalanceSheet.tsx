"use client";
import { parseBalanceSheet, formatCurrency } from "@/lib/quickbooks/parsers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function QBBalanceSheet({ payload }: { payload: any }) {
  if (!payload) return (
    <div className="text-center py-8 text-slate-400 text-sm">
      No Balance Sheet data yet — click <strong>Sync Now</strong> to load
    </div>
  );

  const s = parseBalanceSheet(payload);
  const debtRatio = s.totalAssets !== 0 ? ((s.totalLiabilities / s.totalAssets) * 100).toFixed(1) : "0";
  const currentRatio = s.currentLiabilities !== 0 ? (s.currentAssets / s.currentLiabilities).toFixed(2) : "N/A";

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Assets", value: s.totalAssets, color: "bg-blue-50 border-blue-100 text-blue-900" },
          { label: "Total Liabilities", value: s.totalLiabilities, color: "bg-red-50 border-red-100 text-red-900" },
          { label: "Total Equity", value: s.totalEquity, color: s.totalEquity >= 0 ? "bg-green-50 border-green-100 text-green-900" : "bg-orange-50 border-orange-100 text-orange-900" },
        ].map((c) => (
          <div key={c.label} className={`border rounded-xl p-4 ${c.color}`}>
            <div className="text-xs font-medium opacity-70">{c.label}</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(c.value)}</div>
          </div>
        ))}
      </div>

      {/* Ratios */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Current Ratio", value: currentRatio, desc: "Current Assets / Current Liabilities", good: parseFloat(currentRatio as string) >= 1.5 },
          { label: "Debt Ratio", value: `${debtRatio}%`, desc: "Liabilities / Assets", good: parseFloat(debtRatio) < 50 },
        ].map((r) => (
          <div key={r.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500">{r.label}</div>
            <div className={`text-2xl font-bold mt-0.5 ${r.good ? "text-green-700" : "text-orange-700"}`}>{r.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Detailed rows */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {(payload?.Rows?.Row ?? []).slice(0, 3).map((section: Record<string, unknown>, i: number) => {
          const header = (section as { Header?: { ColData?: { value: string }[] } }).Header?.ColData?.[0]?.value;
          const summary = (section as { Summary?: { ColData?: { value: string }[] } }).Summary?.ColData;
          return (
            <div key={i} className="border-b border-slate-100 last:border-0">
              <div className="flex justify-between px-4 py-2.5 bg-slate-50">
                <span className="text-sm font-semibold text-slate-700">{header}</span>
                <span className="text-sm font-bold font-mono text-slate-800">{formatCurrency(summary?.[1]?.value)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
