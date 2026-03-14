import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qbTokens, qbCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Changed from GET to POST to prevent CSRF attacks
export async function POST(req: NextRequest) {
  try {
    const { realmId } = await req.json();

    if (!realmId || typeof realmId !== "string" || !/^\d+$/.test(realmId)) {
      return NextResponse.json({ error: "Invalid realmId" }, { status: 400 });
    }

    await db.delete(qbCache).where(eq(qbCache.realmId, realmId));
    await db.delete(qbTokens).where(eq(qbTokens.realmId, realmId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
