"use client";
import { parsePnLSummary, formatCurrency } from "@/lib/quickbooks/parsers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function QBPnL({ payload }: { payload: any }) {
  if (!payload) return <EmptyCard label="P&L Report" />;
  const s = parsePnLSummary(payload);

  const rows = [
    { label: "Total Revenue", value: s.revenue, bold: true, color: "text-green-700" },
    { label: "Cost of Goods Sold", value: s.cogs, sub: true, color: "text-slate-600" },
    { label: "Gross Profit", value: s.grossProfit, bold: true, color: s.grossProfit >= 0 ? "text-blue-700" : "text-red-700", extra: `${s.grossMarginPct.toFixed(1)}% margin` },
    { label: "Operating Expenses", value: s.expenses, sub: true, color: "text-slate-600" },
    { label: "Net Income", value: s.netIncome, bold: true, large: true, color: s.netIncome >= 0 ? "text-green-700" : "text-red-700" },
  ];

  return (
    <div className="space-y-4">
      {s.startDate && (
        <p className="text-xs text-slate-400">
          Period: {s.startDate} → {s.endDate}
        </p>
      )}
      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.label}
            className={`flex items-center justify-between py-2.5 px-4 rounded-lg ${r.large ? "bg-slate-100 mt-2" : r.sub ? "" : "bg-white border border-slate-100"}`}
          >
            <span className={`text-sm ${r.bold ? "font-semibold text-slate-800" : "text-slate-500 pl-2"}`}>
              {r.label}
              {r.extra && <span className="text-xs text-slate-400 ml-2">({r.extra})</span>}
            </span>
            <span className={`font-mono text-sm ${r.bold ? "font-bold" : ""} ${r.color}`}>
              {formatCurrency(r.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function QBPnLDetailed({ payload }: { payload: any }) {
  if (!payload) return <EmptyCard label="Detailed P&L" />;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderRows(rows: any[], depth = 0): React.ReactNode {
    return rows.map((row, i) => {
      if (row.type === "Section") {
        const header = row.Header?.ColData?.[0]?.value;
        const summary = row.Summary?.ColData;
        const children = row.Rows?.Row ?? [];
        return (
          <div key={i} className={depth === 0 ? "mt-3" : ""}>
            {header && (
              <div className={`flex justify-between py-1.5 px-3 ${depth === 0 ? "bg-slate-100 font-semibold text-slate-700 rounded-t" : "text-slate-600"}`}>
                <span className="text-sm" style={{ paddingLeft: depth * 12 }}>{header}</span>
                {summary && <span className="text-sm font-mono text-slate-500">{formatCurrency(summary[1]?.value)}</span>}
              </div>
            )}
            {renderRows(children, depth + 1)}
            {summary && depth === 0 && (
              <div className="flex justify-between py-1.5 px-3 bg-slate-50 border-t border-slate-200 rounded-b">
                <span className="text-sm font-semibold text-slate-700" style={{ paddingLeft: depth * 12 }}>
                  {summary[0]?.value}
                </span>
                <span className={`text-sm font-bold font-mono ${parseFloat(summary[1]?.value) >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatCurrency(summary[1]?.value)}
                </span>
              </div>
            )}
          </div>
        );
      }
      if (row.type === "Data") {
        const cols = row.ColData ?? [];
        return (
          <div key={i} className="flex justify-between py-1 px-3 hover:bg-slate-50">
            <span className="text-xs text-slate-600" style={{ paddingLeft: (depth + 1) * 12 }}>{cols[0]?.value}</span>
            <span className="text-xs font-mono text-slate-600">{formatCurrency(cols[1]?.value)}</span>
          </div>
        );
      }
      return null;
    });
  }

  const rows = payload?.Rows?.Row ?? [];
  return (
    <div className="divide-y divide-slate-100">
      {renderRows(rows)}
    </div>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <div className="text-center py-8 text-slate-400 text-sm">
      No {label} data yet — click <strong>Sync Now</strong> to load
    </div>
  );
}
