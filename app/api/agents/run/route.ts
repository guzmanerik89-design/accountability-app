import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentRuns, qbCache, qbTokens } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { runOrchestrator } from "@/lib/agents/orchestrator";

// Simple in-memory rate limiter (per realmId, max 1 run per 2 minutes)
const recentRuns = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const { realmId } = await req.json();

    // Validate realmId
    if (!realmId || typeof realmId !== "string" || !/^\d+$/.test(realmId)) {
      return NextResponse.json({ error: "Invalid realmId" }, { status: 400 });
    }

    // Rate limit: max 1 run per 2 minutes per realm
    const lastRun = recentRuns.get(realmId);
    if (lastRun && Date.now() - lastRun < 120_000) {
      return NextResponse.json({ error: "Please wait before running another analysis" }, { status: 429 });
    }

    // Verify the realmId is actually connected (has tokens)
    const [token] = await db.select().from(qbTokens).where(eq(qbTokens.realmId, realmId)).limit(1);
    if (!token) {
      return NextResponse.json({ error: "Company not connected" }, { status: 404 });
    }

    // Check for already running analysis
    const [existingRun] = await db.select().from(agentRuns)
      .where(and(eq(agentRuns.realmId, realmId), eq(agentRuns.status, "running")))
      .limit(1);
    if (existingRun) {
      return NextResponse.json({ error: "Analysis already running", runId: existingRun.id }, { status: 409 });
    }

    // Get company name from cache
    const [companyCache] = await db.select().from(qbCache)
      .where(and(eq(qbCache.realmId, realmId), eq(qbCache.dataKey, "company")))
      .limit(1);

    const companyInfo = companyCache?.payload as Record<string, unknown> | undefined;
    const clientName = (companyInfo?.CompanyName as string) || `Company ${realmId.slice(-6)}`;

    // Create run record
    const [run] = await db.insert(agentRuns).values({
      realmId,
      clientName,
      status: "pending",
      progress: {},
    }).returning();

    // Track for rate limiting
    recentRuns.set(realmId, Date.now());

    // Clean old entries from rate limiter
    for (const [key, time] of recentRuns) {
      if (Date.now() - time > 300_000) recentRuns.delete(key);
    }

    // Start orchestrator in background
    runOrchestrator(run.id, realmId).catch((err) => {
      console.error("Orchestrator fatal error:", err);
    });

    return NextResponse.json({ runId: run.id, status: "started" });
  } catch {
    return NextResponse.json({ error: "Failed to start analysis" }, { status: 500 });
  }
}
