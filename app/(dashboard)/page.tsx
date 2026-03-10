import { db } from "@/lib/db";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { ClientProgressTable } from "@/components/dashboard/ClientProgressTable";
import { SprintCalendar } from "@/components/dashboard/SprintCalendar";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const allClients = await db.query.clients.findMany({
    with: { tasks: true, billing: true },
    orderBy: (c, { asc }) => [asc(c.deadline)],
  });

  const totalTasks = allClients.reduce((sum, c) => sum + c.tasks.length, 0);
  const completeTasks = allClients.reduce(
    (sum, c) => sum + c.tasks.filter((t) => t.status === "complete").length, 0
  );
  const inProgressTasks = allClients.reduce(
    (sum, c) => sum + c.tasks.filter((t) => t.status === "in_progress").length, 0
  );
  const notStartedTasks = allClients.reduce(
    (sum, c) => sum + c.tasks.filter((t) => t.status === "not_started").length, 0
  );
  const lastDeadline = allClients[allClients.length - 1]?.deadline;
  const daysLeft = lastDeadline
    ? Math.ceil((new Date(lastDeadline).getTime() - Date.now()) / 86400000)
    : 0;

  return {
    allClients,
    kpis: { totalTasks, completeTasks, inProgressTasks, notStartedTasks, daysLeft },
  };
}

export default async function DashboardPage() {
  try {
    const { allClients, kpis } = await getDashboardData();
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Master Accounting & Tax Tracker — {allClients.length} businesses
          </p>
        </div>
        <DashboardKPIs kpis={kpis} />
        <ClientProgressTable clients={allClients} />
        <SprintCalendar />
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <p className="font-semibold">Error loading dashboard data</p>
          <p className="text-sm mt-1 font-mono">{String(error)}</p>
        </div>
      </div>
    );
  }
}
