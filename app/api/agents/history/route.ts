import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const realmId = searchParams.get("realmId");

  const query = realmId
    ? db.select().from(agentRuns).where(eq(agentRuns.realmId, realmId)).orderBy(desc(agentRuns.startedAt)).limit(20)
    : db.select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(20);

  const runs = await query;

  return NextResponse.json(runs.map((r) => ({
    id: r.id,
    realmId: r.realmId,
    clientName: r.clientName,
    status: r.status,
    progress: r.progress,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
  })));
}
