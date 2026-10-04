import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasAny } from "@/lib/roles";
import { STATUS_LABELS, buildSlots, isoWeekday, todayStr } from "@/lib/slots";

export const Route = createFileRoute("/_authenticated/booking")({
  head: () => ({ meta: [{ title: "Запись на приём — АИС «Больница»" }] }),
  component: BookingPage,
});

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function BookingPage() {
  const { roles, user } = Route.useRouteContext();
  const qc = useQueryClient();
  const isStaff = hasAny(roles, ["registrar", "admin"]);
  const canBook = isStaff || roles.includes("patient");

  const [depId, setDepId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [patientId, setPatientId] = useState("");
  const [pq, setPq] = useState("");

  const { data: ref } = useQuery({
    queryKey: ["ref", "booking"],
    queryFn: async () => {
      const [d, doc, s] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("doctors").select("*").order("full_name"),
        supabase.from("doctor_schedules").select("*"),
      ]);
      return { deps: d.data ?? [], doctors: doc.data ?? [], schedules: s.data ?? [] };
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["booking-patients", isStaff, pq],
    queryFn: async () => {
      let q = supabase.from("patients").select("id, full_name, birth_date").order("full_name").limit(50);
      if (!isStaff) q = q.eq("user_id", user.id);
      else if (pq.trim()) q = q.ilike("full_name", `%${pq.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
  });
  const myPatientId = !isStaff ? patients[0]?.id : undefined;
  const effectivePatient = isStaff ? patientId : myPatientId ?? "";

  const schedule = ref?.schedules.find((s) => s.doctor_id === doctorId && s.weekday === isoWeekday(date));

  const { data: busy = [] } = useQuery({
    queryKey: ["busy", doctorId, date],
    enabled: !!doctorId && !!date,
    queryFn: async () => {
      const from = new Date(date + "T00:00:00");
      const to = new Date(from.getTime() + 86400000);
      const { data, error } = await supabase.rpc("get_busy_slots", { _doctor_id: doctorId, _from: from.toISOString(), _to: to.toISOString() });
      if (error) throw error;
      return (data ?? []).map((t: string) => new Date(t).getTime());
    },
  });

  const slots = useMemo(() => {
    if (!schedule) return [];
    const now = Date.now();
    return buildSlots(date, schedule.start_time, schedule.end_time, schedule.slot_minutes).map((d) => ({
      d, free: d.getTime() > now && !busy.includes(d.getTime()),
    }));
  }, [schedule, date, busy]);

  const { data: myAppts = [] } = useQuery({
    queryKey: ["my-appts", myPatientId],
    enabled: !!myPatientId,
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("id, scheduled_at, status, doctors(full_name, specialty)").eq("patient_id", myPatientId!).order("scheduled_at", { ascending: false });
      return data ?? [];
    },
  });

  async function book(slot: Date) {
    if (!effectivePatient) {
      toast.error(isStaff ? "Выберите пациента" : "Карточка пациента не найдена");
      return;
    }
    const { error } = await supabase.from("appointments").insert({ patient_id: effectivePatient, doctor_id: doctorId, scheduled_at: slot.toISOString(), created_by: user.id });
    if (error) {
      toast.error(error.code === "23505" ? "Это время уже занято — выберите другое" : error.message);
    } else {
      toast.success(`Запись создана на ${slot.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}`);
    }
    qc.invalidateQueries({ queryKey: ["busy"] });
    qc.invalidateQueries({ queryKey: ["my-appts"] });
  }

  async function cancel(id: string) {
    const { error } = await supabase.rpc("cancel_my_appointment", { _id: id });
    if (error) toast.error(error.message);
    else toast.success("Запись отменена");
    qc.invalidateQueries({ queryKey: ["my-appts"] });
    qc.invalidateQueries({ queryKey: ["busy"] });
  }

  if (!canBook) return <p>Нет доступа к этому разделу.</p>;
  const doctors = (ref?.doctors ?? []).filter((d) => !depId || d.department_id === depId);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10 space-y-4">
        <h2 className="font-display text-xl font-bold">Запись на приём</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isStaff && (
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label>Пациент</Label>
              <div className="flex gap-2">
                <Input placeholder="Поиск по ФИО" value={pq} onChange={(e) => setPq(e.target.value)} className="max-w-xs" />
                <select className={sel} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                  <option value="">— выберите пациента —</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.birth_date ? ` (${new Date(p.birth_date).toLocaleDateString("ru-RU")})` : ""}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="space-y-1.5"><Label>Отделение</Label>
            <select className={sel} value={depId} onChange={(e) => { setDepId(e.target.value); setDoctorId(""); }}>
              <option value="">Все отделения</option>{ref?.deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
          <div className="space-y-1.5 lg:col-span-2"><Label>Врач</Label>
            <select className={sel} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">— выберите врача —</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name} — {d.specialty}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>Дата</Label><Input type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>

        {doctorId && (
          <div>
            <p className="text-sm font-semibold mb-2">Свободное время</p>
            {!schedule && <p className="text-sm text-muted-foreground">Врач не принимает в этот день.</p>}
            <div className="flex flex-wrap gap-2">
              {slots.map(({ d, free }) => (
                <Button key={d.getTime()} size="sm" variant={free ? "outline" : "ghost"} disabled={!free} onClick={() => book(d)} className={free ? "" : "line-through"}>
                  {d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isStaff && (
        <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
          <h2 className="font-display text-xl font-bold mb-3">Мои записи</h2>
          {myAppts.length === 0 && <p className="text-sm text-muted-foreground">Записей пока нет</p>}
          <div className="space-y-2">
            {myAppts.map((a) => (
              <div key={a.id} className="rounded-2xl glass-soft p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{new Date(a.scheduled_at).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}</p>
                  <p className="text-xs text-muted-foreground">{a.doctors?.full_name} · {a.doctors?.specialty}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs rounded-full bg-brand/10 text-brand-deep px-2.5 py-1">{STATUS_LABELS[a.status]}</span>
                  {["created", "confirmed"].includes(a.status) && new Date(a.scheduled_at) > new Date() && (
                    <Button size="sm" variant="ghost" onClick={() => cancel(a.id)}>Отменить</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
