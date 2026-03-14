import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentRuns, agentReports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const id = parseInt(runId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid runId" }, { status: 400 });

  const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const reports = await db.select().from(agentReports).where(eq(agentReports.runId, id));

  return NextResponse.json({
    id: run.id,
    realmId: run.realmId,
    clientName: run.clientName,
    status: run.status,
    progress: run.progress,
    error: run.error,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    reports: reports.map((r) => ({
      agentName: r.agentName,
      status: r.status,
      output: r.output,
      createdAt: r.createdAt,
    })),
    finalReport: run.finalReport,
  });
}
