import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qbTokens, qbCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Called when a user disconnects from QuickBooks (also used as Intuit's Disconnect URL)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const realmId = searchParams.get("realmId");

  if (realmId) {
    await db.delete(qbCache).where(eq(qbCache.realmId, realmId));
    await db.delete(qbTokens).where(eq(qbTokens.realmId, realmId));
  }

  return NextResponse.redirect(new URL("/quickbooks", req.url));
}
