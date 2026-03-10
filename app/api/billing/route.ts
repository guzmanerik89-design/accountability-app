import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billing } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allBilling = await db.query.billing.findMany({
      with: { client: true },
    });
    return NextResponse.json(allBilling);
  } catch {
    return NextResponse.json({ error: "Failed to fetch billing" }, { status: 500 });
  }
}
