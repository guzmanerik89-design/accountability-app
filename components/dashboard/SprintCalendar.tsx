import { SPRINT_DAYS } from "@/lib/constants";

export function SprintCalendar() {
  const today = new Date();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">14-Day Sprint Calendar</h2>
        <p className="text-sm text-slate-500 mt-0.5">Feb 25 – Mar 10, 2026</p>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-7 gap-2">
          {SPRINT_DAYS.map((day, i) => {
            const isWeek2 = i >= 7;
            return (
              <div
                key={day.day}
                className={`rounded-lg p-3 border text-xs ${
                  isWeek2
                    ? "bg-purple-50 border-purple-100"
                    : "bg-blue-50 border-blue-100"
                } ${day.focus === "DEADLINE" ? "bg-red-50 border-red-200" : ""}`}
              >
                <div className={`font-bold text-xs mb-0.5 ${isWeek2 ? "text-purple-700" : "text-blue-700"} ${day.focus === "DEADLINE" ? "text-red-700" : ""}`}>
                  {day.day}
                </div>
                <div className="text-slate-500 text-[10px]">{day.date}</div>
                <div className={`font-semibold mt-1 text-[11px] ${isWeek2 ? "text-purple-800" : "text-blue-800"} ${day.focus === "DEADLINE" ? "text-red-800" : ""}`}>
                  {day.focus}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-200 inline-block"></span> Week 1
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-200 inline-block"></span> Week 2
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-200 inline-block"></span> Deadline
          </span>
        </div>
      </div>
    </div>
  );
}
