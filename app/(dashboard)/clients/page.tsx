import { db } from "@/lib/db";
import { ClientsManager } from "@/components/dashboard/ClientsManager";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await db.query.clients.findMany({
    with: { tasks: true, billing: true },
    orderBy: (c, { asc }) => [asc(c.deadline)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Client Management</h1>
        <p className="text-slate-500 mt-1">Manage businesses, contacts, entity types & notes</p>
      </div>
      <ClientsManager clients={clients} />
    </div>
  );
}
