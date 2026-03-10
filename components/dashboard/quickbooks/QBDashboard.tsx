"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QBSyncButton } from "./QBSyncButton";
import { QBPnL, QBPnLDetailed } from "./QBPnL";
import { QBBalanceSheet } from "./QBBalanceSheet";
import { QBInvoices } from "./QBInvoices";
import { QBAccounts } from "./QBAccounts";
import { formatCurrency } from "@/lib/quickbooks/parsers";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache: Record<string, { payload: any; syncedAt: string }>;
  lastSynced?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  companyInfo?: any;
}

export function QBDashboard({ cache, lastSynced, companyInfo }: Props) {
  const hasData = Object.keys(cache).length > 0;

  // Quick KPIs from P&L
  const pnlPayload = cache.pnl?.payload;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let netIncome: number | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let totalRevenue: number | null = null;
  if (pnlPayload) {
    const { parsePnLSummary } = require("@/lib/quickbooks/parsers");
    const s = parsePnLSummary(pnlPayload);
    netIncome = s.netIncome;
    totalRevenue = s.revenue;
  }

  const invoicePayload = cache.invoices?.payload;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices: any[] = invoicePayload?.QueryResponse?.Invoice ?? [];
  const overdueCount = invoices.filter((i) => {
    const bal = parseFloat(i.Balance ?? "0");
    return bal > 0 && i.DueDate && new Date(i.DueDate) < new Date();
  }).length;
  const totalAR = invoices.filter((i) => parseFloat(i.Balance ?? "0") > 0)
    .reduce((s, i) => s + parseFloat(i.Balance), 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customers: any[] = cache.customers?.payload?.QueryResponse?.Customer ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendors: any[] = cache.vendors?.payload?.QueryResponse?.Vendor ?? [];

  return (
    <div className="w-full space-y-5">
      {/* Header bar with sync */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {companyInfo && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-semibold text-green-800">{companyInfo.CompanyName}</span>
              {companyInfo.LegalAddr?.City && (
                <span className="text-xs text-green-600">{companyInfo.LegalAddr.City}, {companyInfo.LegalAddr.CountrySubDivisionCode}</span>
              )}
            </div>
          )}
        </div>
        <QBSyncButton syncedAt={lastSynced} />
      </div>

      {!hasData && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center text-orange-700">
          <p className="font-semibold">No data synced yet</p>
          <p className="text-sm mt-1">Click <strong>Sync Now</strong> to pull data from QuickBooks</p>
        </div>
      )}

      {hasData && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Net Income (YTD)",
                value: netIncome !== null ? formatCurrency(netIncome) : "—",
                color: netIncome !== null && netIncome >= 0 ? "bg-green-50 border-green-100 text-green-900" : "bg-red-50 border-red-100 text-red-900",
              },
              {
                label: "Total Revenue (YTD)",
                value: totalRevenue !== null ? formatCurrency(totalRevenue) : "—",
                color: "bg-blue-50 border-blue-100 text-blue-900",
              },
              {
                label: "AR Outstanding",
                value: formatCurrency(totalAR),
                color: totalAR > 0 ? "bg-orange-50 border-orange-100 text-orange-900" : "bg-green-50 border-green-100 text-green-900",
                sub: `${overdueCount} overdue`,
              },
              {
                label: "Active Customers",
                value: customers.length > 0 ? customers.length : "—",
                color: "bg-slate-50 border-slate-200 text-slate-800",
                sub: vendors.length > 0 ? `${vendors.length} vendors` : undefined,
              },
            ].map((kpi) => (
              <div key={kpi.label} className={`border rounded-xl p-4 ${kpi.color}`}>
                <div className="text-xs font-medium opacity-70">{kpi.label}</div>
                <div className="text-xl font-bold mt-0.5">{kpi.value}</div>
                {kpi.sub && <div className="text-xs opacity-60 mt-0.5">{kpi.sub}</div>}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pnl" className="w-full">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="pnl">P&amp;L Summary</TabsTrigger>
              <TabsTrigger value="pnl_detail">P&amp;L Detail</TabsTrigger>
              <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
            </TabsList>

            <TabsContent value="pnl" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Profit & Loss — Year to Date</h3>
                <QBPnL payload={cache.pnl?.payload} />
              </div>
            </TabsContent>

            <TabsContent value="pnl_detail" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Profit & Loss — Full Detail</h3>
                <QBPnLDetailed payload={cache.pnl?.payload} />
              </div>
            </TabsContent>

            <TabsContent value="balance" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Balance Sheet</h3>
                <QBBalanceSheet payload={cache.balance_sheet?.payload} />
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Invoices — Current Fiscal Year</h3>
                <QBInvoices payload={cache.invoices?.payload} />
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Chart of Accounts</h3>
                <QBAccounts payload={cache.accounts?.payload} />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
