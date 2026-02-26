import { Check, X, Clock, CalendarOff, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AttendanceStatsProps {
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
  };
}

export function AttendanceStats({ stats }: AttendanceStatsProps) {
  const items = [
    {
      label: "Total",
      value: stats.total,
      icon: Users,
      color: "bg-slate-100 text-slate-600",
    },
    {
      label: "Present",
      value: stats.present,
      icon: Check,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Absent",
      value: stats.absent,
      icon: X,
      color: "bg-red-100 text-red-600",
    },
    {
      label: "Late",
      value: stats.late,
      icon: Clock,
      color: "bg-amber-100 text-amber-600",
    },
    {
      label: "Leave",
      value: stats.leave,
      icon: CalendarOff,
      color: "bg-blue-100 text-blue-600",
    },
  ];

  const marked = stats.present + stats.absent + stats.late + stats.leave;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _percentage =
    stats.total > 0 ? Math.round((marked / stats.total) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${item.color}`}
            >
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
