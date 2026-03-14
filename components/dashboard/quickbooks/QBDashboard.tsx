"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QBSyncButton } from "./QBSyncButton";
import { QBPnL, QBPnLDetailed } from "./QBPnL";
import { QBBalanceSheet } from "./QBBalanceSheet";
import { QBInvoices } from "./QBInvoices";
import { QBAccounts } from "./QBAccounts";
import { QB1099Vendors } from "./QB1099Vendors";
import { QBTaxReadiness } from "./QBTaxReadiness";
import { QBIndustryKPIs } from "./QBIndustryKPIs";
import { QBPeriodSelector } from "./QBPeriodSelector";
import type { DateRange } from "./QBPeriodSelector";
import {
  formatCurrency,
  parsePnLSummary,
  parseBalanceSheet,
  parseCompanyProfile,
  parse1099Vendors,
  assessTaxReadiness,
  getIndustryKPIs,
  parseEquityBreakdown,
  parsePnLEntityInsights,
} from "@/lib/quickbooks/parsers";
import type { EntityType, TaxForm } from "@/lib/quickbooks/parsers";

interface CompanySummary {
  realmId: string;
  name: string;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache: Record<string, { payload: any; syncedAt: string }>;
  lastSynced?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  companyInfo?: any;
  activeRealmId: string;
  companies: CompanySummary[];
}

const ENTITY_COLORS: Record<string, string> = {
  "Sole Proprietorship": "bg-amber-100 text-amber-700",
  "S-Corp": "bg-blue-100 text-blue-700",
  "C-Corp": "bg-purple-100 text-purple-700",
  "Partnership": "bg-teal-100 text-teal-700",
  "LLC": "bg-indigo-100 text-indigo-700",
  "Nonprofit": "bg-pink-100 text-pink-700",
  "Unknown": "bg-slate-100 text-slate-600",
};

const TAX_FORM_LABELS: Record<TaxForm, string> = {
  "Schedule C": "Schedule C (1040)",
  "Form 1120-S": "1120-S + K-1",
  "Form 1120": "1120",
  "Form 1065": "1065 + K-1",
  "Form 990": "990",
  "Unknown": "—",
};

export function QBDashboard({ cache, lastSynced, companyInfo, activeRealmId, companies }: Props) {
  const router = useRouter();
  const hasData = Object.keys(cache).length > 0;

  // Period selector state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customPnl, setCustomPnl] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customBs, setCustomBs] = useState<any>(null);
  const [periodLabel, setPeriodLabel] = useState<string>("");
  const [periodLoading, setPeriodLoading] = useState(false);

  const handlePeriodChange = useCallback(async (range: DateRange) => {
    setPeriodLoading(true);
    setPeriodLabel(range.label);
    try {
      const params = new URLSearchParams({
        realmId: activeRealmId,
        startDate: range.startDate,
        endDate: range.endDate,
      });
      const [pnlRes, bsRes] = await Promise.allSettled([
        fetch(`/api/quickbooks/report?report=pnl&${params}`).then((r) => r.json()),
        fetch(`/api/quickbooks/report?report=balance_sheet&${params}`).then((r) => r.json()),
      ]);
      setCustomPnl(pnlRes.status === "fulfilled" && !pnlRes.value.error ? pnlRes.value.data : null);
      setCustomBs(bsRes.status === "fulfilled" && !bsRes.value.error ? bsRes.value.data : null);
    } catch {
      toast.error("Error al cargar reportes del período");
      setCustomPnl(null);
      setCustomBs(null);
    } finally {
      setPeriodLoading(false);
    }
  }, [activeRealmId]);

  // Use custom data if available, otherwise cache
  const activePnlPayload = customPnl || cache.pnl?.payload;
  const activeBsPayload = customBs || cache.balance_sheet?.payload;

  // Company profile
  const profile = parseCompanyProfile(companyInfo);
  const companyName = profile.companyName || companies.find((c) => c.realmId === activeRealmId)?.name || "Empresa";

  // P&L
  let pnlSummary = null;
  let pnlPeriod = "";
  if (activePnlPayload) {
    pnlSummary = parsePnLSummary(activePnlPayload);
    if (pnlSummary.startDate && pnlSummary.endDate) pnlPeriod = `${pnlSummary.startDate} → ${pnlSummary.endDate}`;
  }

  // Balance Sheet
  const bsSummary = activeBsPayload ? parseBalanceSheet(activeBsPayload) : null;

  // Entity insights
  const entityInsights = parsePnLEntityInsights(activePnlPayload, cache.accounts?.payload, profile.entityType);

  // Equity breakdown
  const equityBreakdown = parseEquityBreakdown(cache.accounts?.payload, profile.entityType);

  // 1099 Vendors
  const vendors1099 = parse1099Vendors(cache.vendors?.payload, cache.vendor_expenses?.payload);

  // Tax readiness
  const taxChecks = assessTaxReadiness(cache, profile.entityType);
  const taxScore = taxChecks.length > 0
    ? Math.round((taxChecks.filter((c) => c.status === "pass").length / taxChecks.length) * 100)
    : 0;

  // Industry KPIs
  const industryKPIs = getIndustryKPIs(profile.industry, pnlSummary, bsSummary);

  // Invoice stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices: any[] = cache.invoices?.payload?.QueryResponse?.Invoice ?? [];
  const overdueCount = invoices.filter((i) => {
    const bal = parseFloat(i.Balance ?? "0");
    return bal > 0 && i.DueDate && new Date(i.DueDate) < new Date();
  }).length;
  const totalAR = invoices
    .filter((i) => parseFloat(i.Balance ?? "0") > 0)
    .reduce((s, i) => s + parseFloat(i.Balance), 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customers: any[] = cache.customers?.payload?.QueryResponse?.Customer ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendors: any[] = cache.vendors?.payload?.QueryResponse?.Vendor ?? [];

  const needs1099Count = vendors1099.filter((v) => v.needs1099).length;
  const missing1099Info = vendors1099.filter((v) => v.needs1099 && (!v.hasTIN || !v.hasAddress)).length;

  function handleCompanyChange(realmId: string) {
    router.push(`/quickbooks?realmId=${realmId}`);
  }

  return (
    <div className="w-full space-y-5">
      {/* Company Identity Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="mt-1 w-10 h-10 rounded-full bg-[#2CA01C] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">QB</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{companyName}</h2>
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Conectado</span>
                {profile.entityType !== "Unknown" && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTITY_COLORS[profile.entityType]}`}>
                    {profile.entityType}
                  </span>
                )}
                {profile.taxForm !== "Unknown" && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                    {TAX_FORM_LABELS[profile.taxForm]}
                  </span>
                )}
              </div>
              {profile.legalName && profile.legalName !== companyName && (
                <p className="text-sm text-slate-500 mt-0.5">Legal: {profile.legalName}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                {(profile.city || profile.state) && (
                  <span className="text-xs text-slate-400">
                    {[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}
                  </span>
                )}
                {profile.ein && <span className="text-xs text-slate-400">EIN: {profile.ein}</span>}
                {profile.industry && (
                  <span className="text-xs text-slate-400">Industria: {profile.industry}</span>
                )}
                {profile.fiscalYearStart && <span className="text-xs text-slate-400">Inicio fiscal: mes {profile.fiscalYearStart}</span>}
                {pnlPeriod && <span className="text-xs text-slate-400">Periodo: {pnlPeriod}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Ver empresa:</label>
              <select
                value={activeRealmId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
              >
                {companies.map((c) => (
                  <option key={c.realmId} value={c.realmId}>{c.name}</option>
                ))}
              </select>
              <a
                href="/api/quickbooks/connect"
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:border-[#2CA01C] hover:text-[#2CA01C] transition-colors whitespace-nowrap"
              >
                + Agregar empresa
              </a>
            </div>
            <QBSyncButton syncedAt={lastSynced} realmId={activeRealmId} />
          </div>
        </div>
      </div>

      {!hasData && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center text-orange-700">
          <p className="font-semibold">Sin datos para {companyName}</p>
          <p className="text-sm mt-1">Haz clic en <strong>Sincronizar</strong> para traer datos de QuickBooks</p>
        </div>
      )}

      {hasData && (
        <>
          {/* Period Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold text-slate-700">Período de Reportes</h4>
              {periodLabel && (
                <span className="text-xs px-2 py-0.5 bg-[#2CA01C]/10 text-[#2CA01C] rounded-full font-medium">
                  {periodLabel}
                </span>
              )}
            </div>
            <QBPeriodSelector onPeriodChange={handlePeriodChange} loading={periodLoading} />
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              {
                label: periodLabel ? `Ingreso Neto (${periodLabel})` : "Ingreso Neto (YTD)",
                value: pnlSummary ? formatCurrency(pnlSummary.netIncome) : "—",
                color: pnlSummary && pnlSummary.netIncome >= 0
                  ? "bg-green-50 border-green-100 text-green-900"
                  : "bg-red-50 border-red-100 text-red-900",
              },
              {
                label: "Ingresos Totales (YTD)",
                value: pnlSummary ? formatCurrency(pnlSummary.revenue) : "—",
                color: "bg-blue-50 border-blue-100 text-blue-900",
              },
              {
                label: "Cuentas por Cobrar",
                value: formatCurrency(totalAR),
                color: totalAR > 0
                  ? "bg-orange-50 border-orange-100 text-orange-900"
                  : "bg-green-50 border-green-100 text-green-900",
                sub: overdueCount > 0 ? `${overdueCount} vencidas` : "Al día",
              },
              {
                label: "1099-NEC",
                value: `${needs1099Count}`,
                color: missing1099Info > 0
                  ? "bg-red-50 border-red-100 text-red-900"
                  : "bg-slate-50 border-slate-200 text-slate-800",
                sub: missing1099Info > 0 ? `${missing1099Info} sin W-9` : `${vendors1099.length} vendors tracked`,
              },
              {
                label: "Tax Ready",
                value: `${taxScore}%`,
                color: taxScore >= 80
                  ? "bg-green-50 border-green-100 text-green-900"
                  : taxScore >= 50
                  ? "bg-yellow-50 border-yellow-100 text-yellow-900"
                  : "bg-red-50 border-red-100 text-red-900",
                sub: `${taxChecks.filter((c) => c.status === "fail").length} problemas`,
              },
            ].map((kpi) => (
              <div key={kpi.label} className={`border rounded-xl p-4 ${kpi.color}`}>
                <div className="text-xs font-medium opacity-60 uppercase tracking-wide">{kpi.label}</div>
                <div className="text-xl font-bold mt-1">{kpi.value}</div>
                {kpi.sub && <div className="text-xs opacity-60 mt-0.5">{kpi.sub}</div>}
              </div>
            ))}
          </div>

          {/* Industry KPIs */}
          {industryKPIs.length > 0 && <QBIndustryKPIs kpis={industryKPIs} industry={profile.industry} />}

          {/* Entity-specific insights bar */}
          {(entityInsights.officerCompensation !== null ||
            entityInsights.ownerDraws !== null ||
            entityInsights.guaranteedPayments !== null ||
            entityInsights.payrollExpenses !== null) && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Datos clave — {profile.entityType}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {entityInsights.officerCompensation !== null && (
                  <InsightCard
                    label="Compensación de Oficial"
                    value={formatCurrency(entityInsights.officerCompensation)}
                    note="Requerido para S-Corp"
                    status={entityInsights.officerCompensation > 0 ? "good" : "bad"}
                  />
                )}
                {entityInsights.ownerDraws !== null && (
                  <InsightCard
                    label="Owner's Draws"
                    value={formatCurrency(entityInsights.ownerDraws)}
                    note="No deducible — Schedule C"
                  />
                )}
                {entityInsights.guaranteedPayments !== null && (
                  <InsightCard
                    label="Guaranteed Payments"
                    value={formatCurrency(entityInsights.guaranteedPayments)}
                    note="K-1 Box 4"
                  />
                )}
                {entityInsights.payrollExpenses !== null && (
                  <InsightCard
                    label="Payroll Expenses"
                    value={formatCurrency(entityInsights.payrollExpenses)}
                    note="Gastos de nómina total"
                  />
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="tax_ready" className="w-full">
            <TabsList className="bg-slate-100 flex-wrap h-auto gap-1">
              <TabsTrigger value="tax_ready">Tax Readiness</TabsTrigger>
              <TabsTrigger value="pnl">P&amp;L Resumen</TabsTrigger>
              <TabsTrigger value="pnl_detail">P&amp;L Detalle</TabsTrigger>
              <TabsTrigger value="balance">Balance General</TabsTrigger>
              <TabsTrigger value="equity">Equity ({profile.entityType})</TabsTrigger>
              <TabsTrigger value="1099">1099-NEC</TabsTrigger>
              <TabsTrigger value="invoices">Facturas</TabsTrigger>
              <TabsTrigger value="accounts">Cuentas</TabsTrigger>
            </TabsList>

            <TabsContent value="tax_ready" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <QBTaxReadiness checks={taxChecks} entityType={profile.entityType} taxForm={profile.taxForm} />
              </div>
            </TabsContent>

            <TabsContent value="pnl" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title={periodLabel ? `Estado de Resultados — ${periodLabel}` : "Estado de Resultados — Año en Curso"} period={pnlPeriod} entityType={profile.entityType} taxForm={profile.taxForm} />
                {periodLoading ? <LoadingReport /> : <QBPnL payload={activePnlPayload} entityType={profile.entityType} entityInsights={entityInsights} />}
              </div>
            </TabsContent>

            <TabsContent value="pnl_detail" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title={periodLabel ? `Estado de Resultados Detalle — ${periodLabel}` : "Estado de Resultados — Detalle Completo"} period={pnlPeriod} entityType={profile.entityType} taxForm={profile.taxForm} />
                {periodLoading ? <LoadingReport /> : <QBPnLDetailed payload={activePnlPayload} />}
              </div>
            </TabsContent>

            <TabsContent value="balance" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title={periodLabel ? `Balance General — ${periodLabel}` : "Balance General"} entityType={profile.entityType} taxForm={profile.taxForm} />
                {periodLoading ? <LoadingReport /> : <QBBalanceSheet payload={activeBsPayload} />}
              </div>
            </TabsContent>

            <TabsContent value="equity" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title={`${equityBreakdown.label} — ${profile.entityType}`} entityType={profile.entityType} taxForm={profile.taxForm} />
                <EquityDetail breakdown={equityBreakdown} entityType={profile.entityType} />
              </div>
            </TabsContent>

            <TabsContent value="1099" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title="1099-NEC — Vendors" />
                <QB1099Vendors vendors={vendors1099} />
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title="Facturas — Año Fiscal Actual" />
                <QBInvoices payload={cache.invoices?.payload} />
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title="Catálogo de Cuentas" />
                <QBAccounts payload={cache.accounts?.payload} />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function ReportHeader({
  company,
  title,
  period,
  entityType,
  taxForm,
}: {
  company: string;
  title: string;
  period?: string;
  entityType?: EntityType;
  taxForm?: TaxForm;
}) {
  return (
    <div className="mb-5 pb-4 border-b border-slate-100">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-semibold text-[#2CA01C] uppercase tracking-wider">{company}</p>
        {entityType && entityType !== "Unknown" && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ENTITY_COLORS[entityType]}`}>
            {entityType}
          </span>
        )}
        {taxForm && taxForm !== "Unknown" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
            {TAX_FORM_LABELS[taxForm]}
          </span>
        )}
      </div>
      <h3 className="font-bold text-slate-800 text-base mt-0.5">{title}</h3>
      {period && <p className="text-xs text-slate-400 mt-0.5">Periodo: {period}</p>}
    </div>
  );
}

function LoadingReport() {
  return (
    <div className="flex items-center justify-center py-12 text-slate-400">
      <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">Cargando reporte...</span>
    </div>
  );
}

function InsightCard({
  label,
  value,
  note,
  status,
}: {
  label: string;
  value: string;
  note: string;
  status?: "good" | "bad";
}) {
  return (
    <div className={`rounded-lg p-3 border ${
      status === "bad" ? "bg-red-50 border-red-100" :
      status === "good" ? "bg-green-50 border-green-100" :
      "bg-slate-50 border-slate-200"
    }`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-800 mt-0.5">{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{note}</div>
    </div>
  );
}

function EquityDetail({
  breakdown,
  entityType,
}: {
  breakdown: ReturnType<typeof parseEquityBreakdown>;
  entityType: EntityType;
}) {
  if (breakdown.accounts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No se encontraron cuentas de equity. Sincroniza primero.
      </div>
    );
  }

  const total = breakdown.accounts.reduce((s, a) => s + a.balance, 0);

  const entityNotes: Record<EntityType, string> = {
    "Sole Proprietorship": "Los retiros (draws) no son gastos deducibles. Se reportan en Schedule C como reducciones de equity.",
    "S-Corp": "Las distribuciones no pueden exceder el basis del accionista. La AAA rastrea earnings ya gravados.",
    "C-Corp": "Los dividendos están sujetos a doble tributación. Retained Earnings refleja utilidades acumuladas.",
    "Partnership": "Cada socio necesita cuentas separadas para el K-1. Las distribuciones reducen el basis del socio.",
    "LLC": "El tratamiento fiscal depende de la elección: disregarded entity, partnership, o S-Corp.",
    "Nonprofit": "Los activos netos se clasifican en: sin restricciones, con restricciones temporales, y con restricciones permanentes.",
    "Unknown": "",
  };

  return (
    <div className="space-y-4">
      {entityNotes[entityType] && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
          {entityNotes[entityType]}
        </div>
      )}

      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Cuenta</th>
              <th className="text-left px-3 py-2.5 font-medium text-slate-500">Categoría</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500">Balance</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.accounts.map((a, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{a.name}</td>
                <td className="px-3 py-2.5 text-slate-500">{a.subType}</td>
                <td className={`px-4 py-2.5 text-right font-mono font-semibold ${a.balance < 0 ? "text-red-600" : "text-slate-700"}`}>
                  {formatCurrency(a.balance)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 border-t border-slate-200">
              <td className="px-4 py-2.5 font-bold text-slate-800" colSpan={2}>
                Total {breakdown.label}
              </td>
              <td className={`px-4 py-2.5 text-right font-mono font-bold ${total < 0 ? "text-red-700" : "text-green-700"}`}>
                {formatCurrency(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
