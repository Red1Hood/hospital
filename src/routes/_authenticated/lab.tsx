import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { openLabFile } from "@/components/MedcardView";

export const Route = createFileRoute("/_authenticated/lab")({
  head: () => ({ meta: [{ title: "Лаборатория — АИС «Больница»" }] }),
  component: LabPage,
});

function LabPage() {
  const { roles } = Route.useRouteContext();
  const [tab, setTab] = useState<"open" | "completed">("open");
  const { data = [], isLoading } = useQuery({
    queryKey: ["lab", tab],
    enabled: roles.includes("lab"),
    queryFn: async () => {
      const { data, error } = await supabase.from("referrals")
        .select("id, type, comment, created_at, status, patients(full_name, birth_date), doctors(full_name), lab_results(*)")
        .eq("status", tab).order("created_at", { ascending: tab === "open" }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (!roles.includes("lab")) return <p>Раздел доступен только сотрудникам лаборатории.</p>;

  return (
    <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">Направления</h2>
        <div className="flex gap-1">
          {(["open", "completed"] as const).map((t) => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>{t === "open" ? "Открытые" : "Выполненные"}</Button>
          ))}
        </div>
      </div>
      {isLoading && <p>Загрузка…</p>}
      {!isLoading && data.length === 0 && <p className="text-sm text-muted-foreground">Направлений нет</p>}
      <div className="space-y-3">
        {data.map((r) => (
          <div key={r.id} className="rounded-2xl glass-soft p-4 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold">{r.type} — {r.patients?.full_name}</p>
                <p className="text-xs text-muted-foreground">Врач: {r.doctors?.full_name} · {new Date(r.created_at).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}</p>
                {r.comment && <p className="text-sm">{r.comment}</p>}
              </div>
            </div>
            {r.status === "open" ? <ResultForm referralId={r.id} /> : r.lab_results.map((lr) => (
              <div key={lr.id} className="text-sm">
                {lr.result_text && <p>{lr.result_text}</p>}
                {lr.result_file_url && <button className="text-brand font-semibold" onClick={() => openLabFile(lr.result_file_url!)}>Открыть файл</button>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultForm({ referralId }: { referralId: string }) {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) {
      toast.error("Введите текст результата или прикрепите файл");
      return;
    }
    setBusy(true);
    let path: string | null = null;
    if (file) {
      path = `${referralId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from("lab-results").upload(path, file);
      if (up.error) {
        setBusy(false);
        toast.error(up.error.message);
        return;
      }
    }
    const { error } = await supabase.from("lab_results").insert({ referral_id: referralId, result_text: text.trim() || null, result_file_url: path, entered_by: user.id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Результат внесён");
    qc.invalidateQueries({ queryKey: ["lab"] });
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-border/60 pt-3">
      <Label>Результат</Label>
      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        <Button type="submit" size="sm" disabled={busy}>Сохранить результат</Button>
      </div>
    </form>
  );
}
