"use client";
import type { TaxReadinessCheck, EntityType, TaxForm } from "@/lib/quickbooks/parsers";

interface Props {
  checks: TaxReadinessCheck[];
  entityType: EntityType;
  taxForm: TaxForm;
}

const STATUS_STYLES: Record<string, { bg: string; icon: string; border: string }> = {
  pass: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
  warning: { bg: "bg-yellow-50", icon: "text-yellow-600", border: "border-yellow-200" },
  fail: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-200" },
  info: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
};

const STATUS_ICONS: Record<string, string> = {
  pass: "\u2713",
  warning: "\u26A0",
  fail: "\u2717",
  info: "\u2139",
};

export function QBTaxReadiness({ checks, entityType, taxForm }: Props) {
  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warning").length;
  const total = checks.length;
  const score = total > 0 ? Math.round((passCount / total) * 100) : 0;

  const scoreColor =
    score >= 80 ? "text-green-700 bg-green-50 border-green-200"
    : score >= 50 ? "text-yellow-700 bg-yellow-50 border-yellow-200"
    : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="space-y-4">
      {/* Header with score */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800">Tax Readiness</h3>
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
              {entityType} &mdash; {taxForm}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Validación automática antes de preparar impuestos
          </p>
        </div>
        <div className={`border rounded-xl px-4 py-2 text-center ${scoreColor}`}>
          <div className="text-2xl font-bold">{score}%</div>
          <div className="text-xs font-medium">Tax Ready</div>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
          {passCount} OK
        </span>
        {warnCount > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
            {warnCount} Advertencias
          </span>
        )}
        {failCount > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">
            {failCount} Problemas
          </span>
        )}
      </div>

      {/* Checks list - failures and warnings first */}
      <div className="space-y-2">
        {[...checks].sort((a, b) => {
          const order: Record<string, number> = { fail: 0, warning: 1, info: 2, pass: 3 };
          return (order[a.status] ?? 4) - (order[b.status] ?? 4);
        }).map((check) => {
          const style = STATUS_STYLES[check.status] ?? STATUS_STYLES.info;
          return (
            <div key={check.id} className={`border ${style.border} ${style.bg} rounded-xl p-4`}>
              <div className="flex items-start gap-3">
                <span className={`text-lg font-bold ${style.icon} mt-0.5 flex-shrink-0`}>
                  {STATUS_ICONS[check.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-800">{check.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{check.description}</div>
                  {check.detail && (
                    <div className="text-xs text-slate-600 mt-1.5 bg-white/60 rounded-lg px-3 py-2">
                      {check.detail}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
