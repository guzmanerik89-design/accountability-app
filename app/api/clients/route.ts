import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, tasks, billing } from "@/lib/db/schema";
import { ACCOUNTING_TASKS, TAX_TASKS } from "@/lib/constants";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allClients = await db.query.clients.findMany({
      with: { tasks: true, billing: true },
      orderBy: (c, { asc }) => [asc(c.deadline)],
    });
    return NextResponse.json(allClients);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [client] = await db
      .insert(clients)
      .values({
        name: body.name,
        contactName: body.contactName,
        phone: body.phone,
        email: body.email,
        entityType: body.entityType,
        einLast4: body.einLast4,
        deadline: body.deadline,
        notes: body.notes,
        missingItems: body.missingItems,
      })
      .returning();

    // Auto-create all accounting and tax tasks
    const taskInserts = [
      ...ACCOUNTING_TASKS.map((t, i) => ({
        clientId: client.id,
        category: "accounting" as const,
        taskName: t,
        status: "not_started" as const,
        taskOrder: i,
      })),
      ...TAX_TASKS.map((t, i) => ({
        clientId: client.id,
        category: "tax" as const,
        taskName: t,
        status: "not_started" as const,
        taskOrder: i,
      })),
    ];
    await db.insert(tasks).values(taskInserts);

    // Auto-create billing record
    await db.insert(billing).values({ clientId: client.id, monthsBilled: 1 });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
