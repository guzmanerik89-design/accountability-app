import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const category = searchParams.get("category");

    let query = db.query.tasks.findMany({
      orderBy: (t, { asc }) => [asc(t.taskOrder)],
    });

    const allTasks = await db.query.tasks.findMany({
      where: and(
        clientId ? eq(tasks.clientId, parseInt(clientId)) : undefined,
        category ? eq(tasks.category, category as "accounting" | "tax") : undefined
      ),
      orderBy: (t, { asc }) => [asc(t.taskOrder)],
    });

    return NextResponse.json(allTasks);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
