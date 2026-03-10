import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billing } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const [updated] = await db
      .update(billing)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(billing.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update billing" }, { status: 500 });
  }
}
