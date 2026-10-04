import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Stethoscope, FlaskConical, FileText, BedDouble } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const REF_STATUS: Record<string, string> = { open: "Ожидает результата", completed: "Результат готов", cancelled: "Отменено" };

type Event = { at: string; kind: "visit" | "referral" | "result"; title: string; sub?: string; body?: { label: string; text: string | null }[]; file?: string | null };

export async function openLabFile(path: string) {
  const { data, error } = await supabase.storage.from("lab-results").createSignedUrl(path, 300);
  if (error || !data) {
    toast.error("Не удалось открыть файл");
    return;
  }
  window.open(data.signedUrl, "_blank");
}

export function MedcardView({ patientId }: { patientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["medcard", patientId],
    queryFn: async () => {
      const [p, v, r] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
        supabase.from("medical_visits").select("*, appointments!inner(scheduled_at, patient_id, doctors(full_name, specialty))").eq("appointments.patient_id", patientId),
        supabase.from("referrals").select("*, doctors(full_name), lab_results(*)").eq("patient_id", patientId),
      ]);
      const events: Event[] = [];
      for (const x of v.data ?? []) {
        events.push({
          at: x.appointments.scheduled_at, kind: "visit",
          title: `Приём: ${x.appointments.doctors?.full_name ?? ""}`, sub: x.appointments.doctors?.specialty,
          body: [
            { label: "Жалобы", text: x.complaints }, { label: "Осмотр", text: x.examination },
            { label: "Диагноз", text: x.diagnosis }, { label: "Рекомендации", text: x.recommendations },
          ],
        });
      }
      for (const x of r.data ?? []) {
        events.push({ at: x.created_at, kind: "referral", title: `Направление: ${x.type}`, sub: `${x.doctors?.full_name ?? ""} · ${REF_STATUS[x.status]}`, body: x.comment ? [{ label: "Комментарий", text: x.comment }] : [] });
        for (const lr of x.lab_results ?? []) {
          events.push({ at: lr.created_at, kind: "result", title: `Результат: ${x.type}`, body: [{ label: "Заключение", text: lr.result_text }], file: lr.result_file_url });
        }
      }
      events.sort((a, b) => b.at.localeCompare(a.at));
      return { patient: p.data, events };
    },
  });

  if (isLoading) return <p>Загрузка…</p>;
  if (!data?.patient) return <p>Карта не найдена или нет доступа.</p>;
  const pt = data.patient;
  const icon = { visit: Stethoscope, referral: FileText, result: FlaskConical };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
        <p className="text-xs uppercase tracking-[0.15em] text-brand">Электронная медицинская карта</p>
        <h1 className="font-display text-2xl font-bold">{pt.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          {pt.birth_date ? `Дата рождения: ${new Date(pt.birth_date).toLocaleDateString("ru-RU")}` : ""}{pt.phone ? ` · ${pt.phone}` : ""}
        </p>
      </div>
      <div className="space-y-3">
        {data.events.length === 0 && <p className="text-sm text-muted-foreground">Записей в карте пока нет.</p>}
        {data.events.map((e, i) => {
          const Icon = icon[e.kind] ?? BedDouble;
          return (
            <div key={i} className="rounded-2xl glass-soft p-5 flex gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Icon className="size-5" /></div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                {e.sub && <p className="text-xs text-muted-foreground">{e.sub}</p>}
                {e.body?.filter((b) => b.text).map((b) => <p key={b.label} className="text-sm"><span className="text-muted-foreground">{b.label}: </span>{b.text}</p>)}
                {e.file && <button onClick={() => openLabFile(e.file!)} className="text-sm text-brand font-semibold">Открыть файл результата</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
