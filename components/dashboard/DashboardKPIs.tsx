import { Card, CardContent } from "@/components/ui/card";

interface KPIs {
  totalTasks: number;
  completeTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  daysLeft: number;
}

export function DashboardKPIs({ kpis }: { kpis: KPIs }) {
  const pct = kpis.totalTasks > 0 ? Math.round((kpis.completeTasks / kpis.totalTasks) * 100) : 0;

  const cards = [
    {
      label: "Total Tasks",
      value: kpis.totalTasks,
      sub: "across all businesses",
      color: "text-slate-700",
      bg: "bg-slate-100",
      icon: "📋",
    },
    {
      label: "Complete",
      value: kpis.completeTasks,
      sub: `${pct}% done`,
      color: "text-green-700",
      bg: "bg-green-50",
      icon: "✅",
    },
    {
      label: "In Progress",
      value: kpis.inProgressTasks,
      sub: "tasks active",
      color: "text-blue-700",
      bg: "bg-blue-50",
      icon: "🔄",
    },
    {
      label: "Not Started",
      value: kpis.notStartedTasks,
      sub: "tasks pending",
      color: "text-orange-700",
      bg: "bg-orange-50",
      icon: "⬜",
    },
    {
      label: "Days Left",
      value: kpis.daysLeft,
      sub: "to final deadline",
      color: kpis.daysLeft <= 3 ? "text-red-700" : kpis.daysLeft <= 7 ? "text-yellow-700" : "text-slate-700",
      bg: kpis.daysLeft <= 3 ? "bg-red-50" : kpis.daysLeft <= 7 ? "bg-yellow-50" : "bg-slate-100",
      icon: "📅",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className={`${card.bg} border-0 shadow-sm`}>
          <CardContent className="p-4">
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-sm font-medium text-slate-600 mt-0.5">{card.label}</div>
            <div className="text-xs text-slate-500">{card.sub}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
