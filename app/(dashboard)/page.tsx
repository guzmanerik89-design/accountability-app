import { db } from "@/lib/db";
import { clients, tasks, billing } from "@/lib/db/schema";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { ClientProgressTable } from "@/components/dashboard/ClientProgressTable";
import { SprintCalendar } from "@/components/dashboard/SprintCalendar";
import { eq, count, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const allClients = await db.query.clients.findMany({
    with: { tasks: true, billing: true },
    orderBy: (c, { asc }) => [asc(c.deadline)],
  });

  const totalTasks = allClients.reduce((sum, c) => sum + c.tasks.length, 0);
  const completeTasks = allClients.reduce(
    (sum, c) => sum + c.tasks.filter((t) => t.status === "complete").length,
    0
  );
  const inProgressTasks = allClients.reduce(
    (sum, c) => sum + c.tasks.filter((t) => t.status === "in_progress").length,
    0
  );
  const notStartedTasks = allClients.reduce(
    (sum, c) => sum + c.tasks.filter((t) => t.status === "not_started").length,
    0
  );

  const today = new Date();
  const daysLeft =
    allClients.length > 0 && allClients[allClients.length - 1].deadline
      ? Math.ceil(
          (new Date(allClients[allClients.length - 1].deadline!).getTime() -
            today.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  return {
    allClients,
    kpis: { totalTasks, completeTasks, inProgressTasks, notStartedTasks, daysLeft },
  };
}

export default async function DashboardPage() {
  const { allClients, kpis } = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Master Accounting & Tax Tracker — {allClients.length} businesses</p>
      </div>

      <DashboardKPIs kpis={kpis} />
      <ClientProgressTable clients={allClients} />
      <SprintCalendar />
    </div>
  );
}
