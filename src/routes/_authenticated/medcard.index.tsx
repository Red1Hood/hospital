import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { MedcardView } from "@/components/MedcardView";
import { hasAny } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/medcard/")({
  head: () => ({ meta: [{ title: "Медицинские карты — АИС «Больница»" }] }),
  component: Page,
});

function Page() {
  const { user, roles } = Route.useRouteContext();
  const isViewer = hasAny(roles, ["doctor", "nurse", "admin"]);
  const [q, setQ] = useState("");

  const { data: own } = useQuery({
    queryKey: ["own-patient", user.id],
    enabled: !isViewer,
    queryFn: async () => (await supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle()).data,
  });

  const { data: list = [] } = useQuery({
    queryKey: ["medcard-list", q],
    enabled: isViewer,
    queryFn: async () => {
      let query = supabase.from("patients").select("id, full_name, birth_date").order("full_name").limit(100);
      if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
      return (await query).data ?? [];
    },
  });

  if (!isViewer) {
    if (!roles.includes("patient")) return <p>Нет доступа к этому разделу.</p>;
    return own ? <MedcardView patientId={own.id} /> : <p>Карточка пациента не найдена.</p>;
  }

  return (
    <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-xl font-bold">{roles.includes("doctor") && !hasAny(roles, ["nurse", "admin"]) ? "Карты моих пациентов" : "Медицинские карты"}</h2>
        <Input placeholder="Поиск по ФИО" className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((p) => (
          <Link key={p.id} to="/medcard/$patientId" params={{ patientId: p.id }} className="rounded-2xl glass-soft p-4 hover:-translate-y-0.5 transition-transform">
            <p className="font-semibold">{p.full_name}</p>
            <p className="text-xs text-muted-foreground">{p.birth_date ? new Date(p.birth_date).toLocaleDateString("ru-RU") : "—"}</p>
          </Link>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">Пациентов не найдено</p>}
      </div>
    </div>
  );
}
