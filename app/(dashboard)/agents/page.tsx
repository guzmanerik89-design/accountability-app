import { db } from "@/lib/db";
import { qbTokens, qbCache, agentRuns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AgentsDashboard } from "@/components/dashboard/agents/AgentsDashboard";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  // Load all connected companies
  const allTokens = await db.select().from(qbTokens);

  // Build company list with names
  const companies = await Promise.all(
    allTokens.map(async (t) => {
      const [compRow] = await db.select().from(qbCache)
        .where(and(eq(qbCache.realmId, t.realmId), eq(qbCache.dataKey, "company")))
        .limit(1);
      const cInfo = compRow?.payload as Record<string, unknown> | undefined;
      return {
        realmId: t.realmId,
        name: (cInfo?.CompanyName as string) ?? `Company (${t.realmId.slice(-6)})`,
      };
    })
  );

  // Load recent runs
  const recentRuns = await db.select().from(agentRuns)
    .orderBy(desc(agentRuns.startedAt))
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Accounting Agents</h1>
        <p className="text-slate-500 mt-1">Multi-agent analysis powered by Claude — bookkeeping, tax strategy, audit, and advisory</p>
      </div>
      <AgentsDashboard companies={companies} initialRuns={recentRuns} />
    </div>
  );
}
