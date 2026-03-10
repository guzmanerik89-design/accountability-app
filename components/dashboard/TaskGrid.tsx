"use client";
import { useState } from "react";
import { toast } from "sonner";
import { STATUS_CONFIG } from "@/lib/constants";
import type { TaskStatus } from "@/lib/db/schema";

interface Task {
  id: number;
  taskName: string;
  status: TaskStatus;
  notes: string | null;
}

interface ClientWithTasks {
  id: number;
  name: string;
  deadline: string | null;
  tasks: Task[];
}

const STATUS_CYCLE: TaskStatus[] = [
  "not_started",
  "in_progress",
  "needs_info",
  "review",
  "complete",
];

export function TaskGrid({
  clients,
  category,
}: {
  clients: ClientWithTasks[];
  category: "accounting" | "tax";
}) {
  const [tasksState, setTasksState] = useState<Record<number, TaskStatus>>(() => {
    const map: Record<number, TaskStatus> = {};
    clients.forEach((c) => c.tasks.forEach((t) => (map[t.id] = t.status)));
    return map;
  });
  const [updating, setUpdating] = useState<number | null>(null);

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
        No clients found. Add clients to get started.
      </div>
    );
  }

  const taskNames = clients[0]?.tasks.map((t) => t.taskName) || [];

  const cycleStatus = async (taskId: number, currentStatus: TaskStatus) => {
    const currentIdx = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

    setUpdating(taskId);
    setTasksState((prev) => ({ ...prev, [taskId]: nextStatus }));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Status → ${STATUS_CONFIG[nextStatus].label}`);
    } catch {
      setTasksState((prev) => ({ ...prev, [taskId]: currentStatus }));
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
        <span className="font-medium text-slate-700">Click any cell to cycle status:</span>
        {STATUS_CYCLE.map((s) => (
          <span key={s} className={`px-2 py-0.5 rounded-full border ${STATUS_CONFIG[s].color}`}>
            {STATUS_CONFIG[s].label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[180px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                Task
              </th>
              {clients.map((c) => {
                const done = c.tasks.filter(
                  (t) => tasksState[t.id] === "complete"
                ).length;
                const pct =
                  c.tasks.length > 0
                    ? Math.round((done / c.tasks.length) * 100)
                    : 0;
                return (
                  <th
                    key={c.id}
                    className="px-3 py-3 font-medium text-slate-600 min-w-[120px] text-center"
                  >
                    <div className="truncate max-w-[110px] mx-auto" title={c.name}>
                      {c.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {done}/{c.tasks.length} · {pct}%
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {taskNames.map((taskName, rowIdx) => (
              <tr
                key={taskName}
                className={`border-b border-slate-100 ${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
              >
                <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-inherit z-10 border-r border-slate-200">
                  {taskName}
                </td>
                {clients.map((c) => {
                  const task = c.tasks[rowIdx];
                  if (!task) return <td key={c.id} className="px-3 py-2.5 text-center text-slate-300">—</td>;
                  const status = tasksState[task.id] || task.status;
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <td key={c.id} className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => cycleStatus(task.id, status)}
                        disabled={updating === task.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium transition-all hover:opacity-80 active:scale-95 cursor-pointer ${cfg.color} ${updating === task.id ? "opacity-50 cursor-wait" : ""}`}
                        title="Click to change status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                        {cfg.label}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
