import { db } from "@/lib/db";
import { TaskGrid } from "@/components/dashboard/TaskGrid";

export const dynamic = "force-dynamic";

export default async function TaxesPage() {
  const clients = await db.query.clients.findMany({
    with: {
      tasks: {
        where: (t, { eq }) => eq(t.category, "tax"),
        orderBy: (t, { asc }) => [asc(t.taskOrder)],
      },
    },
    orderBy: (c, { asc }) => [asc(c.deadline)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Taxes</h1>
        <p className="text-slate-500 mt-1">US tax preparation workflow — 1040/1120-S/Schedule C & MACRS depreciation</p>
      </div>

      {/* US Tax Reference */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "1099-NEC Rate", value: "$25/form", desc: "Filing fee per form" },
          { label: "Q1 Est. Payment", value: "Apr 15", desc: "Form 1040-ES due" },
          { label: "Corp Tax Rate", value: "21%", desc: "Federal C-Corp flat rate" },
          { label: "SE Tax Rate", value: "15.3%", desc: "Self-employment tax" },
        ].map((ref) => (
          <div key={ref.label} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="text-xs text-blue-600 font-medium">{ref.label}</div>
            <div className="text-xl font-bold text-blue-900 mt-0.5">{ref.value}</div>
            <div className="text-xs text-blue-600 mt-0.5">{ref.desc}</div>
          </div>
        ))}
      </div>

      <TaskGrid clients={clients} category="tax" />
    </div>
  );
}
