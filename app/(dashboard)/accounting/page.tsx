import { db } from "@/lib/db";
import { TaskGrid } from "@/components/dashboard/TaskGrid";

export const dynamic = "force-dynamic";

export default async function AccountingPage() {
  const clients = await db.query.clients.findMany({
    with: {
      tasks: {
        where: (t, { eq }) => eq(t.category, "accounting"),
        orderBy: (t, { asc }) => [asc(t.taskOrder)],
      },
    },
    orderBy: (c, { asc }) => [asc(c.deadline)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Accounting</h1>
        <p className="text-slate-500 mt-1">Track accounting tasks across all businesses — US GAAP standards</p>
      </div>
      <TaskGrid clients={clients} category="accounting" />
    </div>
  );
}
