"use client";
import { parsePnLSummary, formatCurrency } from "@/lib/quickbooks/parsers";
import type { EntityType, PnLEntityInsights } from "@/lib/quickbooks/parsers";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  entityType?: EntityType;
  entityInsights?: PnLEntityInsights;
}

export function QBPnL({ payload, entityType, entityInsights }: Props) {
  if (!payload) return <EmptyCard label="P&L Report" />;
  const s = parsePnLSummary(payload);

  const rows: Array<{
    label: string;
    value: number;
    bold?: boolean;
    sub?: boolean;
    large?: boolean;
    color: string;
    extra?: string;
    entityNote?: string;
  }> = [
    { label: "Total Revenue", value: s.revenue, bold: true, color: "text-green-700" },
    { label: "Cost of Goods Sold", value: s.cogs, sub: true, color: "text-slate-600" },
    {
      label: "Gross Profit",
      value: s.grossProfit,
      bold: true,
      color: s.grossProfit >= 0 ? "text-blue-700" : "text-red-700",
      extra: `${s.grossMarginPct.toFixed(1)}% margin`,
    },
  ];

  // Entity-specific line items before net income
  if (entityInsights?.officerCompensation !== null && entityInsights?.officerCompensation !== undefined && entityInsights.officerCompensation > 0) {
    rows.push({
      label: "Officer Compensation",
      value: entityInsights.officerCompensation,
      sub: true,
      color: "text-blue-600",
      entityNote: entityType === "S-Corp" ? "Salario razonable requerido por IRS" : undefined,
    });
  }

  if (entityInsights?.guaranteedPayments !== null && entityInsights?.guaranteedPayments !== undefined && entityInsights.guaranteedPayments > 0) {
    rows.push({
      label: "Guaranteed Payments to Partners",
      value: entityInsights.guaranteedPayments,
      sub: true,
      color: "text-teal-600",
      entityNote: "K-1 Box 4 — deducible para el partnership",
    });
  }

  if (entityInsights?.payrollExpenses !== null && entityInsights?.payrollExpenses !== undefined && entityInsights.payrollExpenses > 0) {
    rows.push({
      label: "Payroll Expenses",
      value: entityInsights.payrollExpenses,
      sub: true,
      color: "text-slate-600",
    });
  }

  rows.push({ label: "Operating Expenses", value: s.expenses, sub: true, color: "text-slate-600" });
  rows.push({
    label: "Net Income",
    value: s.netIncome,
    bold: true,
    large: true,
    color: s.netIncome >= 0 ? "text-green-700" : "text-red-700",
    entityNote: entityType === "Sole Proprietorship"
      ? "Se reporta en Schedule C, línea 31"
      : entityType === "S-Corp"
      ? "Fluye a K-1 de accionistas"
      : entityType === "Partnership"
      ? "Se distribuye entre socios vía K-1"
      : undefined,
  });

  // Owner draws at the bottom (not P&L item, but relevant context)
  if (entityInsights?.ownerDraws !== null && entityInsights?.ownerDraws !== undefined && entityInsights.ownerDraws > 0) {
    rows.push({
      label: "Owner's Draws (Equity, no P&L)",
      value: entityInsights.ownerDraws,
      sub: true,
      color: "text-amber-600",
      entityNote: "No es gasto deducible — reducción de equity",
    });
  }

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
            <div className="flex flex-col">
              <span className={`text-sm ${r.bold ? "font-semibold text-slate-800" : "text-slate-500 pl-2"}`}>
                {r.label}
                {r.extra && <span className="text-xs text-slate-400 ml-2">({r.extra})</span>}
              </span>
              {r.entityNote && (
                <span className="text-[10px] text-slate-400 pl-2 mt-0.5">{r.entityNote}</span>
              )}
            </div>
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
      No hay datos de {label} — haz clic en <strong>Sincronizar</strong>
    </div>
  );
}
