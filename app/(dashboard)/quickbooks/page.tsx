import { db } from "@/lib/db";
import { qbTokens, qbCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { QBDashboard } from "@/components/dashboard/quickbooks/QBDashboard";

export const dynamic = "force-dynamic";

export default async function QuickBooksPage() {
  // Check connection
  const tokens = await db.select().from(qbTokens).limit(1);
  const connected = tokens.length > 0;

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QuickBooks</h1>
          <p className="text-slate-500 mt-1">Connect your QuickBooks Online account</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="font-semibold text-slate-800 mb-2">Not Connected</h2>
          <p className="text-slate-500 text-sm mb-4">Connect QuickBooks to sync P&amp;L, Balance Sheet, Invoices and more.</p>
          <a
            href="/api/quickbooks"
            className="inline-flex items-center gap-2 bg-[#2CA01C] hover:bg-[#249016] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Connect QuickBooks Online
          </a>
        </div>
      </div>
    );
  }

  // Load cached data
  const realmId = tokens[0].realmId;
  const cacheRows = await db.select().from(qbCache).where(eq(qbCache.realmId, realmId));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cacheMap: Record<string, { payload: any; syncedAt: string }> = {};
  for (const row of cacheRows) {
    cacheMap[row.dataKey] = {
      payload: row.payload,
      syncedAt: row.syncedAt.toISOString(),
    };
  }

  const lastSynced = cacheRows.length > 0
    ? cacheRows.sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime())[0].syncedAt.toISOString()
    : undefined;

  // Extract company info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyInfo = (cacheMap.company?.payload as any)?.CompanyInfo;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QuickBooks Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {companyInfo?.CompanyName ?? "Connected"} — read-only sync
          </p>
        </div>
        <QBDashboard cache={cacheMap} lastSynced={lastSynced} companyInfo={companyInfo} />
      </div>
    </div>
  );
}
