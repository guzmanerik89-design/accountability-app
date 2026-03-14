"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/quickbooks/parsers";
import type { Vendor1099 } from "@/lib/quickbooks/parsers";

interface Props {
  vendors: Vendor1099[];
}

export function QB1099Vendors({ vendors }: Props) {
  const [filter, setFilter] = useState<"all" | "needs" | "under" | "missing">("all");

  if (vendors.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No hay vendors marcados para 1099 en QuickBooks.
        <br />
        <span className="text-xs">Marca vendors con &quot;Track payments for 1099&quot; en QBO.</span>
      </div>
    );
  }

  const needs1099 = vendors.filter((v) => v.needs1099);
  const under600 = vendors.filter((v) => !v.needs1099 && v.totalPaid > 0);
  const missingInfo = vendors.filter((v) => v.needs1099 && (!v.hasTIN || !v.hasAddress));

  const filtered = (() => {
    switch (filter) {
      case "needs": return needs1099;
      case "under": return under600;
      case "missing": return missingInfo;
      default: return vendors;
    }
  })();

  const totalToPay = needs1099.reduce((s, v) => s + v.totalPaid, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <div className="text-xs text-blue-600 font-medium">Vendors 1099</div>
          <div className="text-xl font-bold text-blue-900">{vendors.length}</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
          <div className="text-xs text-green-600 font-medium">Requieren 1099-NEC</div>
          <div className="text-xl font-bold text-green-900">{needs1099.length}</div>
          <div className="text-xs text-green-600">{formatCurrency(totalToPay)} total</div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
          <div className="text-xs text-orange-600 font-medium">Bajo $600</div>
          <div className="text-xl font-bold text-orange-900">{under600.length}</div>
        </div>
        <div className={`border rounded-xl p-3 ${missingInfo.length > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200"}`}>
          <div className={`text-xs font-medium ${missingInfo.length > 0 ? "text-red-600" : "text-slate-500"}`}>Falta Info</div>
          <div className={`text-xl font-bold ${missingInfo.length > 0 ? "text-red-900" : "text-slate-800"}`}>{missingInfo.length}</div>
          {missingInfo.length > 0 && <div className="text-xs text-red-600">W-9 o dirección</div>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "all" as const, label: `Todos (${vendors.length})` },
          { key: "needs" as const, label: `1099 Requerido (${needs1099.length})` },
          { key: "under" as const, label: `Bajo $600 (${under600.length})` },
          { key: "missing" as const, label: `Falta Info (${missingInfo.length})` },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filter === f.key
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Vendor</th>
              <th className="text-right px-3 py-2.5 font-medium text-slate-500">Total Pagado</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500">TIN/W-9</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500">Dirección</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500">1099-NEC</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-800">{v.name}</div>
                  {v.address && <div className="text-[10px] text-slate-400 mt-0.5">{v.address}</div>}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-700">
                  {formatCurrency(v.totalPaid)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {v.hasTIN ? (
                    <span className="text-green-600 font-bold">&#10003;</span>
                  ) : (
                    <span className="text-red-500 font-bold">&#10007;</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {v.hasAddress ? (
                    <span className="text-green-600 font-bold">&#10003;</span>
                  ) : (
                    <span className="text-red-500 font-bold">&#10007;</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {v.needs1099 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                      Requerido
                    </span>
                  ) : v.totalPaid > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                      &lt; $600
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm">No hay vendors en este filtro</div>
        )}
      </div>
    </div>
  );
}
