"use client";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QBSyncButton } from "./QBSyncButton";
import { QBPnL, QBPnLDetailed } from "./QBPnL";
import { QBBalanceSheet } from "./QBBalanceSheet";
import { QBInvoices } from "./QBInvoices";
import { QBAccounts } from "./QBAccounts";
import { formatCurrency, parsePnLSummary } from "@/lib/quickbooks/parsers";

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

export function QBDashboard({ cache, lastSynced, companyInfo, activeRealmId, companies }: Props) {
  const router = useRouter();
  const hasData = Object.keys(cache).length > 0;

  // KPIs from P&L
  let netIncome: number | null = null;
  let totalRevenue: number | null = null;
  let pnlPeriod = "";
  const pnlPayload = cache.pnl?.payload;
  if (pnlPayload) {
    const s = parsePnLSummary(pnlPayload);
    netIncome = s.netIncome;
    totalRevenue = s.revenue;
    if (s.startDate && s.endDate) pnlPeriod = `${s.startDate} → ${s.endDate}`;
  }

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

  const companyName: string = companyInfo?.CompanyName ?? companies.find((c) => c.realmId === activeRealmId)?.name ?? "Empresa";
  const legalName: string = companyInfo?.LegalName ?? "";
  const ein: string = companyInfo?.EIN ?? "";
  const city: string = companyInfo?.LegalAddr?.City ?? "";
  const state: string = companyInfo?.LegalAddr?.CountrySubDivisionCode ?? "";
  const country: string = companyInfo?.Country ?? companyInfo?.LegalAddr?.Country ?? "";
  const fiscalYearStart: string = companyInfo?.FiscalYearStartMonth ?? "";

  function handleCompanyChange(realmId: string) {
    router.push(`/quickbooks?realmId=${realmId}`);
  }

  return (
    <div className="w-full space-y-5">
      {/* Company Identity Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: identity */}
          <div className="flex items-start gap-4">
            <div className="mt-1 w-10 h-10 rounded-full bg-[#2CA01C] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">QB</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{companyName}</h2>
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Conectado</span>
              </div>
              {legalName && legalName !== companyName && (
                <p className="text-sm text-slate-500 mt-0.5">Legal: {legalName}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                {(city || state) && (
                  <span className="text-xs text-slate-400">{[city, state, country].filter(Boolean).join(", ")}</span>
                )}
                {ein && <span className="text-xs text-slate-400">EIN: {ein}</span>}
                {fiscalYearStart && <span className="text-xs text-slate-400">Inicio fiscal: mes {fiscalYearStart}</span>}
                {pnlPeriod && <span className="text-xs text-slate-400">Periodo: {pnlPeriod}</span>}
              </div>
            </div>
          </div>

          {/* Right: company selector + sync */}
          <div className="flex flex-col sm:items-end gap-2">
            {/* Company selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Ver empresa:</label>
              <select
                value={activeRealmId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
              >
                {companies.map((c) => (
                  <option key={c.realmId} value={c.realmId}>
                    {c.name}
                  </option>
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
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Ingreso Neto (YTD)",
                value: netIncome !== null ? formatCurrency(netIncome) : "—",
                color:
                  netIncome !== null && netIncome >= 0
                    ? "bg-green-50 border-green-100 text-green-900"
                    : "bg-red-50 border-red-100 text-red-900",
              },
              {
                label: "Ingresos Totales (YTD)",
                value: totalRevenue !== null ? formatCurrency(totalRevenue) : "—",
                color: "bg-blue-50 border-blue-100 text-blue-900",
              },
              {
                label: "Cuentas por Cobrar",
                value: formatCurrency(totalAR),
                color:
                  totalAR > 0
                    ? "bg-orange-50 border-orange-100 text-orange-900"
                    : "bg-green-50 border-green-100 text-green-900",
                sub: overdueCount > 0 ? `${overdueCount} vencidas` : "Al día",
              },
              {
                label: "Clientes Activos",
                value: customers.length > 0 ? customers.length : "—",
                color: "bg-slate-50 border-slate-200 text-slate-800",
                sub: vendors.length > 0 ? `${vendors.length} proveedores` : undefined,
              },
            ].map((kpi) => (
              <div key={kpi.label} className={`border rounded-xl p-4 ${kpi.color}`}>
                <div className="text-xs font-medium opacity-60 uppercase tracking-wide">{kpi.label}</div>
                <div className="text-xl font-bold mt-1">{kpi.value}</div>
                {kpi.sub && <div className="text-xs opacity-60 mt-0.5">{kpi.sub}</div>}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pnl" className="w-full">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="pnl">P&amp;L Resumen</TabsTrigger>
              <TabsTrigger value="pnl_detail">P&amp;L Detalle</TabsTrigger>
              <TabsTrigger value="balance">Balance General</TabsTrigger>
              <TabsTrigger value="invoices">Facturas</TabsTrigger>
              <TabsTrigger value="accounts">Cuentas</TabsTrigger>
            </TabsList>

            <TabsContent value="pnl" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title="Estado de Resultados — Año en Curso" period={pnlPeriod} />
                <QBPnL payload={cache.pnl?.payload} />
              </div>
            </TabsContent>

            <TabsContent value="pnl_detail" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title="Estado de Resultados — Detalle Completo" period={pnlPeriod} />
                <QBPnLDetailed payload={cache.pnl?.payload} />
              </div>
            </TabsContent>

            <TabsContent value="balance" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <ReportHeader company={companyName} title="Balance General" />
                <QBBalanceSheet payload={cache.balance_sheet?.payload} />
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

function ReportHeader({ company, title, period }: { company: string; title: string; period?: string }) {
  return (
    <div className="mb-5 pb-4 border-b border-slate-100">
      <p className="text-xs font-semibold text-[#2CA01C] uppercase tracking-wider mb-0.5">{company}</p>
      <h3 className="font-bold text-slate-800 text-base">{title}</h3>
      {period && <p className="text-xs text-slate-400 mt-0.5">Periodo: {period}</p>}
    </div>
  );
}
