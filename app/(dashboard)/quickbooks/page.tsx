import { db } from "@/lib/db";
import { qbTokens, qbCache } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { QBDashboard } from "@/components/dashboard/quickbooks/QBDashboard";

export const dynamic = "force-dynamic";

export default async function QuickBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ realmId?: string; error?: string }>;
}) {
  const { realmId: selectedRealmId, error: oauthError } = await searchParams;

  // Load all connected companies
  const allTokens = await db.select().from(qbTokens);

  if (allTokens.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QuickBooks</h1>
          <p className="text-slate-500 mt-1">Conecta tu cuenta de QuickBooks Online</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="font-semibold text-slate-800 mb-2">Sin conexión</h2>
          <p className="text-slate-500 text-sm mb-4">Conecta QuickBooks para sincronizar P&L, Balance General, Facturas y más.</p>
          <a
            href="/api/quickbooks/connect"
            className="inline-flex items-center gap-2 bg-[#2CA01C] hover:bg-[#249016] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Conectar QuickBooks Online
          </a>
        </div>
      </div>
    );
  }

  // Determine active realmId
  const activeRealmId = (selectedRealmId && allTokens.find((t) => t.realmId === selectedRealmId))
    ? selectedRealmId
    : allTokens[0].realmId;

  // Load cached data for the active company
  const cacheRows = await db.select().from(qbCache).where(eq(qbCache.realmId, activeRealmId));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cacheMap: Record<string, { payload: any; syncedAt: string }> = {};
  for (const row of cacheRows) {
    cacheMap[row.dataKey] = {
      payload: row.payload,
      syncedAt: row.syncedAt.toISOString(),
    };
  }

  const lastSynced =
    cacheRows.length > 0
      ? cacheRows.sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime())[0].syncedAt.toISOString()
      : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyInfo = cacheMap.company?.payload as any;

  // Build company list for the selector (name comes from cache company row)
  const companySummaries = await Promise.all(
    allTokens.map(async (t) => {
      const [compRow] = await db
        .select()
        .from(qbCache)
        .where(and(eq(qbCache.realmId, t.realmId), eq(qbCache.dataKey, "company")))
        .limit(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cInfo = compRow?.payload as any;
      return {
        realmId: t.realmId,
        name: cInfo?.CompanyName ?? `Empresa (${t.realmId.slice(-6)})`,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QuickBooks Dashboard</h1>
        <p className="text-slate-500 mt-1">Datos sincronizados desde QuickBooks Online — solo lectura</p>
      </div>
      {oauthError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">
          <strong>Error al conectar empresa:</strong> {decodeURIComponent(oauthError)}
        </div>
      )}
      <QBDashboard
        cache={cacheMap}
        lastSynced={lastSynced}
        companyInfo={companyInfo}
        activeRealmId={activeRealmId}
        companies={companySummaries}
      />
    </div>
  );
}
