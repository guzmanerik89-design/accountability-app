import { db } from "@/lib/db";
import { SPRINT_DAYS } from "@/lib/constants";
import { format, differenceInDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const clients = await db.query.clients.findMany({
    with: { tasks: true },
    orderBy: (c, { asc }) => [asc(c.deadline)],
  });

  const today = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Deadline Planner</h1>
        <p className="text-slate-500 mt-1">14-day sprint plan · Business deadline priority</p>
      </div>

      {/* Business Priority */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Business Deadline Priority</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-medium text-slate-500">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Business</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Deadline</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Days</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Progress</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Urgency</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => {
                const days = c.deadline
                  ? differenceInDays(new Date(c.deadline), today)
                  : null;
                const done = c.tasks.filter((t) => t.status === "complete").length;
                const pct = c.tasks.length > 0 ? Math.round((done / c.tasks.length) * 100) : 0;

                let urgency = { label: "On Track", color: "bg-green-100 text-green-700" };
                if (days === null) urgency = { label: "No date", color: "bg-gray-100 text-gray-600" };
                else if (days < 0) urgency = { label: "Overdue", color: "bg-red-100 text-red-700" };
                else if (days <= 3) urgency = { label: "Critical", color: "bg-red-100 text-red-700" };
                else if (days <= 7) urgency = { label: "Soon", color: "bg-yellow-100 text-yellow-700" };

                return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-bold text-slate-400">#{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {c.deadline ? format(new Date(c.deadline), "MM/dd/yyyy") : "—"}
                    </td>
                    <td className={`px-4 py-3 text-center font-semibold ${days !== null && days < 0 ? "text-red-600" : "text-slate-700"}`}>
                      {days !== null ? (days < 0 ? `${Math.abs(days)}d ago` : `${days}d`) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${urgency.color}`}>
                        {urgency.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 14-Day Sprint Planner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">14-Day Sprint — Daily Priorities</h2>
        </div>
        <div className="p-5 space-y-2">
          {SPRINT_DAYS.map((day, i) => (
            <div
              key={day.day}
              className={`flex gap-4 p-4 rounded-xl border text-sm ${
                day.focus === "DEADLINE"
                  ? "bg-red-50 border-red-200"
                  : i >= 7
                  ? "bg-purple-50 border-purple-100"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <div className="w-20 shrink-0">
                <div className={`font-bold text-xs ${day.focus === "DEADLINE" ? "text-red-700" : i >= 7 ? "text-purple-700" : "text-blue-700"}`}>
                  {day.day}
                </div>
                <div className="text-xs text-slate-500">{day.date}</div>
              </div>
              <div className="w-28 shrink-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${day.focus === "DEADLINE" ? "bg-red-200 text-red-800" : i >= 7 ? "bg-purple-200 text-purple-800" : "bg-blue-200 text-blue-800"}`}>
                  {day.focus}
                </span>
              </div>
              <div className="text-slate-700 text-xs leading-relaxed">
                {day.tasks.split("\n").map((task, j) => (
                  <div key={j}>• {task}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
