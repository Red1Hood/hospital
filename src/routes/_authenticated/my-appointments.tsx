import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS } from "@/lib/slots";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["appointment_status"];

export const Route = createFileRoute("/_authenticated/my-appointments")({
  head: () => ({ meta: [{ title: "Мои приёмы — АИС «Больница»" }] }),
  component: MyAppointments,
});

function MyAppointments() {
  const { user, roles } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-appts", user.id],
    queryFn: async () => {
      const { data: doc } = await supabase.from("doctors").select("id, full_name").eq("user_id", user.id).maybeSingle();
      if (!doc) return { doc: null, appts: [] };
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, patients(full_name, birth_date, phone)")
        .eq("doctor_id", doc.id)
        .gte("scheduled_at", since.toISOString())
        .not("status", "in", "(cancelled,rescheduled)")
        .order("scheduled_at");
      return { doc, appts: appts ?? [] };
    },
  });

  async function setStatus(id: string, status: Status) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["doctor-appts"] });
  }

  if (!roles.includes("doctor")) return <p>Раздел доступен только врачам.</p>;
  if (isLoading) return <p>Загрузка…</p>;
  if (!data?.doc) return <p>Ваша учётная запись не привязана к карточке врача. Обратитесь к администратору.</p>;

  return (
    <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
      <h2 className="font-display text-xl font-bold mb-4">Предстоящие приёмы — {data.doc.full_name}</h2>
      {data.appts.length === 0 && <p className="text-sm text-muted-foreground">Записей нет</p>}
      <div className="space-y-2">
        {data.appts.map((a) => (
          <div key={a.id} className="rounded-2xl glass-soft p-4 flex flex-wrap items-center gap-3">
            <div className="w-40">
              <p className="font-display font-semibold">{new Date(a.scheduled_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
              <p className="text-xs text-muted-foreground">{new Date(a.scheduled_at).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" })}</p>
            </div>
            <div className="flex-1 min-w-40">
              <p className="font-semibold">{a.patients?.full_name}</p>
              <p className="text-xs text-muted-foreground">{a.patients?.phone || ""}</p>
            </div>
            <Link to="/visit/$appointmentId" params={{ appointmentId: a.id }} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {a.status === "completed" ? "Открыть приём" : "Начать приём"}
            </Link>
            <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={a.status} onChange={(e) => setStatus(a.id, e.target.value as Status)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
