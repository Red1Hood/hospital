import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { hasAny } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Отчёты — АИС «Больница»" }] }),
  component: ReportsPage,
});

type Stats = {
  appointments: number; hospitalizations: number; beds_total: number; beds_occupied: number;
  by_day: { day: string; appointments: number; hospitalizations: number }[];
  by_doctor: { doctor: string; count: number }[];
};

function ReportsPage() {
  const { roles } = Route.useRouteContext();
  const [days, setDays] = useState(7);
  const allowed = hasAny(roles, ["admin", "manager"]);
  const { data, error } = useQuery({
    queryKey: ["reports", days],
    enabled: allowed,
    queryFn: async () => {
      const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - (days - 1));
      const { data, error } = await supabase.rpc("report_stats", { _from: from.toISOString() });
      if (error) throw error;
      return data as unknown as Stats;
    },
  });
  if (!allowed) return <p>Нет доступа к отчётам.</p>;
  const pct = data && data.beds_total ? Math.round((data.beds_occupied / data.beds_total) * 100) : 0;
  const byDay = (data?.by_day ?? []).map((d) => ({ ...d, day: new Date(d.day).toLocaleDateString("ru", { day: "2-digit", month: "2-digit" }) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl glass p-6 shadow-xl shadow-brand/10">
        <h1 className="font-display text-2xl font-bold">Административная отчётность</h1>
        <div className="flex gap-1 rounded-xl glass-soft p-1">
          {[7, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 text-sm ${days === d ? "bg-brand text-primary-foreground" : "text-muted-foreground"}`}>Последние {d} дней</button>
          ))}
        </div>
      </div>
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Приёмов за период" value={data?.appointments ?? "—"} />
        <Kpi label="Госпитализаций за период" value={data?.hospitalizations ?? "—"} />
        <Kpi label="Занятость коек" value={data ? `${pct}%` : "—"} hint={data ? `${data.beds_occupied} из ${data.beds_total}` : ""} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl glass p-6">
          <p className="font-display font-semibold mb-3">Динамика по дням</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={byDay}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="appointments" name="Приёмы" stroke="var(--brand)" strokeWidth={2} />
              <Line type="monotone" dataKey="hospitalizations" name="Госпитализации" stroke="var(--aqua)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-3xl glass p-6">
          <p className="font-display font-semibold mb-3">Нагрузка по врачам</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.by_doctor ?? []}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="doctor" fontSize={11} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip />
              <Bar dataKey="count" name="Приёмов" fill="var(--brand)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl glass-soft p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
