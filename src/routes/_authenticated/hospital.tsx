import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BedDouble, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasAny } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/hospital")({
  head: () => ({ meta: [{ title: "Госпитализация — АИС «Больница»" }] }),
  component: HospitalPage,
});

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const H_STATUS: Record<string, string> = { awaiting: "Ожидает", admitted: "Госпитализирован", transferred: "Переведён", discharged: "Выписан" };

function HospitalPage() {
  const { roles, user } = Route.useRouteContext();
  const isAdmin = roles.includes("admin");
  const canAdmit = hasAny(roles, ["registrar", "admin", "doctor"]);
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["hosp"] });

  const { data } = useQuery({
    queryKey: ["hosp"],
    queryFn: async () => {
      const [d, r, b, h, p] = await Promise.all([
        supabase.from("departments").select("id,name").order("name"),
        supabase.from("rooms").select("*").order("number"),
        supabase.from("beds").select("*").order("number"),
        supabase.from("hospitalizations").select("*, patients(full_name), beds(number, rooms(number))").order("admitted_at", { ascending: false }).limit(200),
        canAdmit ? supabase.from("patients").select("id,full_name").order("full_name").limit(500) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
      ]);
      return { deps: d.data ?? [], rooms: r.data ?? [], beds: b.data ?? [], hosps: h.data ?? [], patients: p.data ?? [] };
    },
  });

  const [room, setRoom] = useState({ number: "", department_id: "", capacity: "2" });
  const [adm, setAdm] = useState({ patient_id: "", bed_id: "" });
  const [moveTo, setMoveTo] = useState<Record<string, string>>({});

  if (!hasAny(roles, ["registrar", "admin", "doctor", "nurse", "patient"])) return <p>Нет доступа.</p>;
  const freeBeds = (data?.beds ?? []).filter((b) => !b.is_occupied);
  const roomNo = (id: string) => data?.rooms.find((r) => r.id === id)?.number ?? "";

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await p;
    if (error) toast.error(error.message.includes("one_active_per_bed") ? "Койка уже занята" : error.message.includes("one_active_per_patient") ? "Пациент уже госпитализирован" : error.message);
    else { toast.success(ok); refresh(); }
  }

  async function addRoom() {
    const cap = Math.max(1, Number(room.capacity) || 1);
    const { data: r, error } = await supabase.from("rooms").insert({ number: room.number, department_id: room.department_id || null, capacity: cap }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await run(supabase.from("beds").insert(Array.from({ length: cap }, (_, i) => ({ room_id: r.id, number: String(i + 1) }))), "Палата создана");
    setRoom({ number: "", department_id: "", capacity: "2" });
  }

  const active = (data?.hosps ?? []).filter((h) => h.status !== "discharged");
  const occupied = (data?.beds ?? []).filter((b) => b.is_occupied).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
        <h1 className="font-display text-2xl font-bold">Госпитализация и коечный фонд</h1>
        <p className="text-sm text-muted-foreground">Занято коек: {occupied} из {data?.beds.length ?? 0}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.rooms ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl glass-soft p-4">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold">Палата {r.number}</p>
              {isAdmin && <button aria-label="Удалить палату" onClick={() => run(supabase.from("rooms").delete().eq("id", r.id), "Палата удалена")}><Trash2 className="size-4 text-muted-foreground" /></button>}
            </div>
            <p className="text-xs text-muted-foreground">{data?.deps.find((d) => d.id === r.department_id)?.name ?? "Без отделения"} · мест: {r.capacity}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data?.beds.filter((b) => b.room_id === r.id).map((b) => (
                <span key={b.id} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${b.is_occupied ? "bg-destructive/10 text-destructive" : "bg-brand/10 text-brand-deep"}`}>
                  <BedDouble className="size-3.5" />{b.number}{b.is_occupied ? " — занята" : " — свободна"}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {isAdmin && (
          <form onSubmit={(e) => { e.preventDefault(); addRoom(); }} className="rounded-3xl glass p-6 space-y-3">
            <p className="font-display font-semibold">Новая палата</p>
            <div><Label>Номер</Label><Input required value={room.number} onChange={(e) => setRoom({ ...room, number: e.target.value })} /></div>
            <div><Label>Отделение</Label>
              <select className={sel} value={room.department_id} onChange={(e) => setRoom({ ...room, department_id: e.target.value })}>
                <option value="">—</option>{data?.deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></div>
            <div><Label>Количество коек</Label><Input type="number" min={1} max={50} value={room.capacity} onChange={(e) => setRoom({ ...room, capacity: e.target.value })} /></div>
            <Button type="submit">Создать палату с койками</Button>
          </form>
        )}
        {canAdmit && (
          <form onSubmit={(e) => { e.preventDefault(); run(supabase.from("hospitalizations").insert({ patient_id: adm.patient_id, bed_id: adm.bed_id, created_by: user.id }), "Пациент госпитализирован").then(() => setAdm({ patient_id: "", bed_id: "" })); }} className="rounded-3xl glass p-6 space-y-3">
            <p className="font-display font-semibold">Оформить госпитализацию</p>
            <div><Label>Пациент</Label>
              <select required className={sel} value={adm.patient_id} onChange={(e) => setAdm({ ...adm, patient_id: e.target.value })}>
                <option value="">Выберите…</option>{data?.patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select></div>
            <div><Label>Свободная койка</Label>
              <select required className={sel} value={adm.bed_id} onChange={(e) => setAdm({ ...adm, bed_id: e.target.value })}>
                <option value="">Выберите…</option>{freeBeds.map((b) => <option key={b.id} value={b.id}>Палата {roomNo(b.room_id)}, койка {b.number}</option>)}
              </select></div>
            <Button type="submit" disabled={!freeBeds.length}>Госпитализировать</Button>
          </form>
        )}
      </div>

      <div className="rounded-3xl glass p-6">
        <p className="font-display font-semibold mb-3">Госпитализации</p>
        {!data?.hosps.length && <p className="text-sm text-muted-foreground">Пока нет записей.</p>}
        <div className="space-y-2">
          {data?.hosps.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl glass-soft p-3 text-sm">
              <div className="flex-1 min-w-48">
                <p className="font-semibold">{h.patients?.full_name}</p>
                <p className="text-xs text-muted-foreground">Палата {h.beds?.rooms?.number}, койка {h.beds?.number} · с {new Date(h.admitted_at).toLocaleDateString("ru")}{h.discharged_at ? ` по ${new Date(h.discharged_at).toLocaleDateString("ru")}` : ""}</p>
              </div>
              <span className="rounded-lg bg-brand/10 px-2 py-1 text-xs text-brand-deep">{H_STATUS[h.status]}</span>
              {canAdmit && h.status !== "discharged" && (
                <>
                  {h.status === "awaiting" && <Button size="sm" variant="outline" onClick={() => run(supabase.from("hospitalizations").update({ status: "admitted" }).eq("id", h.id), "Принят в отделение")}>Принять</Button>}
                  <select className={`${sel} w-44`} value={moveTo[h.id] ?? ""} onChange={(e) => setMoveTo({ ...moveTo, [h.id]: e.target.value })}>
                    <option value="">Перевести на…</option>{freeBeds.map((b) => <option key={b.id} value={b.id}>Пал. {roomNo(b.room_id)}, к. {b.number}</option>)}
                  </select>
                  <Button size="sm" variant="outline" disabled={!moveTo[h.id]} onClick={() => run(supabase.from("hospitalizations").update({ bed_id: moveTo[h.id] }).eq("id", h.id), "Пациент переведён")}>Перевести</Button>
                  <Button size="sm" onClick={() => run(supabase.from("hospitalizations").update({ status: "discharged" }).eq("id", h.id), "Пациент выписан, койка освобождена")}>Выписать</Button>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Активных: {active.length}</p>
      </div>
    </div>
  );
}
