import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS } from "@/lib/slots";
import { ReferralForm } from "@/components/ReferralForm";

export const Route = createFileRoute("/_authenticated/visit/$appointmentId")({
  head: () => ({ meta: [{ title: "Приём пациента — АИС «Больница»" }] }),
  component: VisitPage,
});

const FIELDS = [
  ["complaints", "Жалобы"],
  ["examination", "Результаты осмотра"],
  ["diagnosis", "Диагноз"],
  ["recommendations", "Назначения и рекомендации"],
] as const;
type Form = Record<(typeof FIELDS)[number][0], string>;

function VisitPage() {
  const { appointmentId } = Route.useParams();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>({ complaints: "", examination: "", diagnosis: "", recommendations: "" });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["visit", appointmentId],
    queryFn: async () => {
      const [a, v] = await Promise.all([
        supabase.from("appointments").select("id, scheduled_at, status, patient_id, doctor_id, patients(full_name, birth_date)").eq("id", appointmentId).maybeSingle(),
        supabase.from("medical_visits").select("*").eq("appointment_id", appointmentId).maybeSingle(),
      ]);
      return { appt: a.data, visit: v.data };
    },
  });

  useEffect(() => {
    if (data?.visit) {
      const v = data.visit;
      setForm({ complaints: v.complaints ?? "", examination: v.examination ?? "", diagnosis: v.diagnosis ?? "", recommendations: v.recommendations ?? "" });
    }
  }, [data?.visit]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("medical_visits").upsert({ appointment_id: appointmentId, ...form }, { onConflict: "appointment_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Приём сохранён, запись завершена");
    qc.invalidateQueries({ queryKey: ["visit", appointmentId] });
    qc.invalidateQueries({ queryKey: ["doctor-appts"] });
  }

  if (isLoading) return <p>Загрузка…</p>;
  if (!data?.appt) return <p>Запись не найдена или нет доступа.</p>;
  const a = data.appt;

  return (
    <div className="space-y-6">
      <Link to="/my-appointments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Мои приёмы</Link>
      <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="font-display text-2xl font-bold">{a.patients?.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(a.scheduled_at).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}
              {a.patients?.birth_date && ` · д.р. ${new Date(a.patients.birth_date).toLocaleDateString("ru-RU")}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs rounded-full bg-brand/10 text-brand-deep px-2.5 py-1">{STATUS_LABELS[a.status]}</span>
            <Link to="/medcard/$patientId" params={{ patientId: a.patient_id }} className="text-sm text-brand font-semibold">Медкарта →</Link>
          </div>
        </div>
        <form onSubmit={save} className="space-y-4">
          {FIELDS.map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label>{label}</Label>
              <Textarea rows={3} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <Button type="submit" disabled={saving}>{data.visit ? "Обновить запись приёма" : "Сохранить и завершить приём"}</Button>
        </form>
      </div>
      <ReferralForm patientId={a.patient_id} doctorId={a.doctor_id} appointmentId={a.id} />
    </div>
  );
}
