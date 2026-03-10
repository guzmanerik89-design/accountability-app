import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const ACCOUNTING_TASKS = [
  "Bank 1 Reconciliation",
  "Bank 2 Reconciliation",
  "1099-NEC",
  "Accounts Receivable Review",
  "Accounts Payable Review",
  "Payroll Reconciliation",
  "Fixed Assets Update",
  "Month-End Journal Entries",
  "Financial Statements",
  "Balance Sheet Review",
  "Audit",
  "Review with Client",
];

const TAX_TASKS = [
  "Gather Source Documents",
  "Review Prior Year Return",
  "Income Summary",
  "Deductions & Credits",
  "Depreciation Schedule",
  "Estimated Tax Payments",
  "Tax Prep",
  "Review Tax with Client",
  "Client Sign-off & Filing",
];

const clientsData = [
  {
    name: "Atom Solutions",
    deadline: "2026-03-08",
    accountingStatuses: [
      "complete", "complete", "complete", "complete",
      "not_started", "not_started", "not_started", "not_started",
      "not_started", "not_started", "not_started", "not_started",
    ],
  },
  {
    name: "G3 Prime Renovations",
    deadline: "2026-03-02",
    accountingStatuses: [
      "complete", "not_started", "not_started", "not_started",
      "not_started", "not_started", "not_started", "not_started",
      "not_started", "not_started", "not_started", "not_started",
    ],
  },
  {
    name: "Junior's Commercial Flooring",
    deadline: "2026-02-26",
    accountingStatuses: [
      "complete", "complete", "review", "not_started",
      "not_started", "not_started", "not_started", "not_started",
      "not_started", "not_started", "not_started", "not_started",
    ],
  },
  {
    name: "Ivania Beauty, LLC",
    deadline: "2026-03-07",
    accountingStatuses: Array(12).fill("not_started"),
  },
  {
    name: "Naomi Services Inc.",
    deadline: "2026-03-08",
    accountingStatuses: [
      "not_started", "not_started", "complete", "not_started",
      "not_started", "not_started", "not_started", "not_started",
      "not_started", "not_started", "not_started", "not_started",
    ],
  },
  {
    name: "IZR Solutions Limited Company",
    deadline: "2026-03-09",
    accountingStatuses: Array(12).fill("not_started"),
  },
  {
    name: "BO Auto Repair",
    deadline: "2026-02-28",
    accountingStatuses: Array(12).fill("not_started"),
  },
  {
    name: "MGR Flooring, Inc.",
    deadline: "2026-03-11",
    accountingStatuses: Array(12).fill("not_started"),
  },
  {
    name: "Atlanta RFP Solutions Limited Company",
    deadline: "2026-03-11",
    accountingStatuses: [
      "complete", "in_progress", "not_started", "not_started",
      "not_started", "not_started", "not_started", "not_started",
      "not_started", "not_started", "not_started", "not_started",
    ],
  },
];

async function seed() {
  console.log("Seeding database...");

  for (const clientData of clientsData) {
    const [client] = await db
      .insert(schema.clients)
      .values({
        name: clientData.name,
        deadline: clientData.deadline,
      })
      .returning();

    console.log(`Created client: ${client.name} (id: ${client.id})`);

    // Insert accounting tasks
    for (let i = 0; i < ACCOUNTING_TASKS.length; i++) {
      await db.insert(schema.tasks).values({
        clientId: client.id,
        category: "accounting",
        taskName: ACCOUNTING_TASKS[i],
        status: (clientData.accountingStatuses[i] || "not_started") as schema.TaskStatus,
        taskOrder: i,
      });
    }

    // Insert tax tasks (all not started)
    for (let i = 0; i < TAX_TASKS.length; i++) {
      await db.insert(schema.tasks).values({
        clientId: client.id,
        category: "tax",
        taskName: TAX_TASKS[i],
        status: "not_started",
        taskOrder: i,
      });
    }

    // Insert billing record
    await db.insert(schema.billing).values({
      clientId: client.id,
      monthsBilled: 1,
    });
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
