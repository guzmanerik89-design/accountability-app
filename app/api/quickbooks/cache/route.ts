import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qbCache, qbTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const tokens = await db.select().from(qbTokens).limit(1);
    if (!tokens[0]) return NextResponse.json({ connected: false, data: {} });

    const realmId = tokens[0].realmId;
    const rows = await db.select().from(qbCache).where(eq(qbCache.realmId, realmId));

    const data: Record<string, { payload: unknown; syncedAt: string }> = {};
    for (const row of rows) {
      data[row.dataKey] = { payload: row.payload, syncedAt: row.syncedAt.toISOString() };
    }

    return NextResponse.json({ connected: true, realmId, data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
