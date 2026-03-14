"use client";
import type { IndustryKPI } from "@/lib/quickbooks/parsers";

interface Props {
  kpis: IndustryKPI[];
  industry: string;
}

const STATUS_COLORS: Record<string, string> = {
  good: "bg-green-50 border-green-100 text-green-900",
  warning: "bg-yellow-50 border-yellow-100 text-yellow-900",
  bad: "bg-red-50 border-red-100 text-red-900",
  neutral: "bg-slate-50 border-slate-200 text-slate-800",
};

export function QBIndustryKPIs({ kpis, industry }: Props) {
  if (kpis.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-700">KPIs Financieros</h4>
        {industry && (
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
            {industry}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`border rounded-xl p-3 ${STATUS_COLORS[kpi.status]}`}>
            <div className="text-xs font-medium opacity-60 uppercase tracking-wide">{kpi.label}</div>
            <div className="text-xl font-bold mt-1">{kpi.value}</div>
            <div className="text-xs opacity-50 mt-0.5">{kpi.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
