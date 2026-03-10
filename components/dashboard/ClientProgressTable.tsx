"use client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";

interface ClientWithTasks {
  id: number;
  name: string;
  deadline: string | null;
  tasks: { status: string; category: string }[];
  billing: { id: number } | null;
}

function getDeadlineStatus(deadline: string | null) {
  if (!deadline) return { label: "No deadline", color: "bg-gray-100 text-gray-600" };
  const days = differenceInDays(new Date(deadline), new Date());
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "bg-red-100 text-red-700" };
  if (days === 0) return { label: "Due today", color: "bg-red-100 text-red-700" };
  if (days <= 3) return { label: `${days}d left`, color: "bg-red-100 text-red-700" };
  if (days <= 7) return { label: `${days}d left`, color: "bg-yellow-100 text-yellow-700" };
  return { label: `${days}d left`, color: "bg-green-100 text-green-700" };
}

export function ClientProgressTable({ clients }: { clients: ClientWithTasks[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">Business Progress</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 font-medium text-slate-500">Business</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">Acct Done</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">Tax Done</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">Total</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 min-w-[140px]">Progress</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">Deadline</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const acctTasks = client.tasks.filter((t) => t.category === "accounting");
              const taxTasks = client.tasks.filter((t) => t.category === "tax");
              const acctDone = acctTasks.filter((t) => t.status === "complete").length;
              const taxDone = taxTasks.filter((t) => t.status === "complete").length;
              const totalDone = acctDone + taxDone;
              const totalTasks = client.tasks.length;
              const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;
              const deadlineStatus = getDeadlineStatus(client.deadline);

              let statusLabel = "Not Started";
              let statusColor = "bg-gray-100 text-gray-600";
              if (pct === 100) { statusLabel = "Complete"; statusColor = "bg-green-100 text-green-700"; }
              else if (totalDone > 0) { statusLabel = "In Progress"; statusColor = "bg-blue-100 text-blue-700"; }

              return (
                <tr key={client.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-900">{client.name}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{acctDone}/{acctTasks.length}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{taxDone}/{taxTasks.length}</td>
                  <td className="px-4 py-3 text-center font-medium text-slate-900">{totalDone}/{totalTasks}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {client.deadline && (
                      <span className="text-xs text-slate-600">
                        {format(new Date(client.deadline), "MM/dd/yy")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${deadlineStatus.color}`}>
                      {deadlineStatus.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
