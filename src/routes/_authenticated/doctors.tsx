import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WEEKDAYS } from "@/lib/slots";

export const Route = createFileRoute("/_authenticated/doctors")({
  head: () => ({ meta: [{ title: "Врачи и отделения — АИС «Больница»" }] }),
  component: DoctorsPage,
});

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function DoctorsPage() {
  const { roles } = Route.useRouteContext();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["ref"] });

  const { data } = useQuery({
    queryKey: ["ref", "all"],
    queryFn: async () => {
      const [d, doc, s, p] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("doctors").select("*").order("full_name"),
        supabase.from("doctor_schedules").select("*").order("weekday"),
        supabase.from("profiles").select("user_id, full_name"),
      ]);
      return { deps: d.data ?? [], doctors: doc.data ?? [], schedules: s.data ?? [], profiles: p.data ?? [] };
    },
  });

  const [depName, setDepName] = useState("");
  const [doc, setDoc] = useState({ full_name: "", specialty: "", department_id: "", user_id: "" });
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [schedDoc, setSchedDoc] = useState<string | null>(null);

  const err = (e: { message: string } | null) => { if (e) { toast.error(e.message); return true; } return false; };

  if (!roles.includes("admin")) return <p>Нет доступа к этому разделу.</p>;
  const deps = data?.deps ?? [];

  async function addDep(e: React.FormEvent) {
    e.preventDefault();
    if (err((await supabase.from("departments").insert({ name: depName })).error)) return;
    setDepName(""); refresh();
  }
  async function renameDep(id: string, old: string) {
    const name = prompt("Новое название отделения", old);
    if (!name || name === old) return;
    if (!err((await supabase.from("departments").update({ name }).eq("id", id)).error)) refresh();
  }
  async function delDep(id: string) {
    if (!confirm("Удалить отделение?")) return;
    if (!err((await supabase.from("departments").delete().eq("id", id)).error)) refresh();
  }
  async function saveDoc(e: React.FormEvent) {
    e.preventDefault();
    const row = { full_name: doc.full_name, specialty: doc.specialty, department_id: doc.department_id || null, user_id: doc.user_id || null };
    const { error } = editDocId ? await supabase.from("doctors").update(row).eq("id", editDocId) : await supabase.from("doctors").insert(row);
    if (err(error)) return;
    toast.success("Сохранено");
    setDoc({ full_name: "", specialty: "", department_id: "", user_id: "" }); setEditDocId(null); refresh();
  }
  async function delDoc(id: string) {
    if (!confirm("Удалить врача?")) return;
    if (!err((await supabase.from("doctors").delete().eq("id", id)).error)) refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10 space-y-4 h-fit">
          <h2 className="font-display text-xl font-bold">Отделения</h2>
          <form onSubmit={addDep} className="flex gap-2">
            <Input required placeholder="Название" value={depName} onChange={(e) => setDepName(e.target.value)} />
            <Button type="submit">Добавить</Button>
          </form>
          <ul className="space-y-1.5">
            {deps.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-xl glass-soft px-3 py-2 text-sm">
                {d.name}
                <span className="flex gap-2 text-muted-foreground">
                  <button onClick={() => renameDep(d.id, d.name)} aria-label="Переименовать"><Pencil className="size-4" /></button>
                  <button onClick={() => delDep(d.id)} aria-label="Удалить"><Trash2 className="size-4" /></button>
                </span>
              </li>
            ))}
            {deps.length === 0 && <li className="text-sm text-muted-foreground">Отделений пока нет</li>}
          </ul>
        </div>

        <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10 space-y-4">
          <h2 className="font-display text-xl font-bold">{editDocId ? "Редактирование врача" : "Новый врач"}</h2>
          <form onSubmit={saveDoc} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>ФИО *</Label><Input required value={doc.full_name} onChange={(e) => setDoc({ ...doc, full_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Специальность *</Label><Input required value={doc.specialty} onChange={(e) => setDoc({ ...doc, specialty: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Отделение</Label>
              <select className={sel} value={doc.department_id} onChange={(e) => setDoc({ ...doc, department_id: e.target.value })}>
                <option value="">—</option>{deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></div>
            <div className="space-y-1.5"><Label>Учётная запись (для входа врача)</Label>
              <select className={sel} value={doc.user_id} onChange={(e) => setDoc({ ...doc, user_id: e.target.value })}>
                <option value="">—</option>{data?.profiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name || p.user_id.slice(0, 8)}</option>)}
              </select></div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit">{editDocId ? "Сохранить" : "Добавить врача"}</Button>
              {editDocId && <Button type="button" variant="outline" onClick={() => { setEditDocId(null); setDoc({ full_name: "", specialty: "", department_id: "", user_id: "" }); }}>Отмена</Button>}
            </div>
          </form>

          <div className="space-y-2 pt-2">
            {data?.doctors.map((d) => {
              const sch = data.schedules.filter((s) => s.doctor_id === d.id);
              return (
                <div key={d.id} className="rounded-2xl glass-soft p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-48">
                    <p className="font-semibold">{d.full_name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialty} · {deps.find((x) => x.id === d.department_id)?.name ?? "без отделения"}</p>
                    <p className="text-xs mt-1">{sch.length ? sch.map((s) => `${WEEKDAYS[s.weekday - 1]} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`).join(", ") : <span className="text-muted-foreground">График не задан</span>}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSchedDoc(d.id)}><CalendarDays className="size-4" />График</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditDocId(d.id); setDoc({ full_name: d.full_name, specialty: d.specialty, department_id: d.department_id ?? "", user_id: d.user_id ?? "" }); }}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => delDoc(d.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {schedDoc && data && (
        <ScheduleDialog doctorId={schedDoc} existing={data.schedules.filter((s) => s.doctor_id === schedDoc)} onClose={() => { setSchedDoc(null); refresh(); }} />
      )}
    </div>
  );
}

type Row = { on: boolean; start: string; end: string; slot: number };

function ScheduleDialog({ doctorId, existing, onClose }: { doctorId: string; existing: { weekday: number; start_time: string; end_time: string; slot_minutes: number }[]; onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>(() =>
    WEEKDAYS.map((_, i) => {
      const e = existing.find((x) => x.weekday === i + 1);
      return e ? { on: true, start: e.start_time.slice(0, 5), end: e.end_time.slice(0, 5), slot: e.slot_minutes } : { on: false, start: "09:00", end: "17:00", slot: 20 };
    }),
  );
  const set = (i: number, p: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  async function save() {
    const del = await supabase.from("doctor_schedules").delete().eq("doctor_id", doctorId);
    if (del.error) return toast.error(del.error.message);
    const ins = rows.map((r, i) => ({ ...r, weekday: i + 1 })).filter((r) => r.on)
      .map((r) => ({ doctor_id: doctorId, weekday: r.weekday, start_time: r.start, end_time: r.end, slot_minutes: r.slot }));
    if (ins.length) {
      const { error } = await supabase.from("doctor_schedules").insert(ins);
      if (error) return toast.error(error.message);
    }
    toast.success("График сохранён");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>График работы</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div className="grid grid-cols-[60px_1fr_1fr_80px] gap-2 text-xs text-muted-foreground"><span>День</span><span>Начало</span><span>Конец</span><span>Слот, мин</span></div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[60px_1fr_1fr_80px] gap-2 items-center">
              <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={r.on} onChange={(e) => set(i, { on: e.target.checked })} />{WEEKDAYS[i]}</label>
              <Input type="time" disabled={!r.on} value={r.start} onChange={(e) => set(i, { start: e.target.value })} />
              <Input type="time" disabled={!r.on} value={r.end} onChange={(e) => set(i, { end: e.target.value })} />
              <Input type="number" min={5} max={240} disabled={!r.on} value={r.slot} onChange={(e) => set(i, { slot: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <Button onClick={save}>Сохранить график</Button>
      </DialogContent>
    </Dialog>
  );
}
