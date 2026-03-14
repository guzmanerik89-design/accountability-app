import { db } from "@/lib/db";
import { agentRuns, agentReports, qbCache } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseCompanyProfile } from "@/lib/quickbooks/parsers";
import { AGENT_ORDER, AGENT_CONFIG, type AgentContext, type AgentName } from "./index";
import type { AgentProgress } from "@/lib/db/schema";

export async function runOrchestrator(runId: number, realmId: string) {
  try {
    // Update status to running
    await db.update(agentRuns).set({ status: "running" }).where(eq(agentRuns.id, runId));

    // Load all QB cache data for this realm
    const cacheRows = await db.select().from(qbCache).where(eq(qbCache.realmId, realmId));
    const cache: Record<string, Record<string, unknown>> = {};
    for (const row of cacheRows) {
      cache[row.dataKey] = row.payload as Record<string, unknown>;
    }

    // Parse company profile
    const profile = parseCompanyProfile(cache.company || null);

    // Build agent context
    const ctx: AgentContext = {
      realmId,
      clientName: profile.companyName || "Unknown Company",
      entityType: profile.entityType,
      industry: profile.industry || "General",
      companyInfo: cache.company || {},
      pnl: cache.pnl || null,
      balanceSheet: cache.balance_sheet || null,
      accounts: cache.accounts || null,
      invoices: cache.invoices || null,
      vendors: cache.vendors || null,
      customers: cache.customers || null,
      trialBalance: cache.trial_balance || null,
      vendorExpenses: cache.vendor_expenses || null,
      previousOutputs: {},
    };

    // Initialize progress
    const progress: Record<string, AgentProgress> = {};
    for (const name of AGENT_ORDER) {
      progress[name] = { status: "pending" };
    }
    await db.update(agentRuns).set({ progress }).where(eq(agentRuns.id, runId));

    // Run agents in sequence
    for (const agentName of AGENT_ORDER) {
      const agent = AGENT_CONFIG[agentName];

      // Update progress: running
      progress[agentName] = { status: "running", message: `Running ${agent.label}...`, startedAt: new Date().toISOString() };
      await db.update(agentRuns).set({ progress }).where(eq(agentRuns.id, runId));

      try {
        const output = await agent.run(ctx);

        // Save agent report
        await db.insert(agentReports).values({
          runId,
          agentName,
          output,
          status: "completed",
        });

        // Add to previous outputs for next agents
        ctx.previousOutputs[agentName] = output;

        // Update progress: completed
        progress[agentName] = { status: "completed", message: `${agent.label} completed`, startedAt: progress[agentName].startedAt, completedAt: new Date().toISOString() };
        await db.update(agentRuns).set({ progress }).where(eq(agentRuns.id, runId));

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        progress[agentName] = { status: "failed", message: `Error: ${errorMsg}`, startedAt: progress[agentName].startedAt, completedAt: new Date().toISOString() };
        await db.update(agentRuns).set({ progress }).where(eq(agentRuns.id, runId));

        // Save failed report
        await db.insert(agentReports).values({
          runId,
          agentName,
          output: `Error: ${errorMsg}`,
          status: "failed",
        });

        // Continue with other agents even if one fails
      }
    }

    // Get the final advisory report
    const [advisoryReport] = await db.select().from(agentReports)
      .where(and(eq(agentReports.runId, runId), eq(agentReports.agentName, "client_advisory")))
      .limit(1);

    // Update run as completed
    await db.update(agentRuns).set({
      status: "completed",
      finalReport: advisoryReport?.output || "No advisory report generated",
      completedAt: new Date(),
      progress,
    }).where(eq(agentRuns.id, runId));

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await db.update(agentRuns).set({
      status: "failed",
      error: errorMsg,
      completedAt: new Date(),
    }).where(eq(agentRuns.id, runId));
  }
}
