import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasAny } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/patients")({
  head: () => ({ meta: [{ title: "Пациенты — АИС «Больница»" }] }),
  component: PatientsPage,
});

const empty = { full_name: "", birth_date: "", phone: "", address: "" };

function PatientsPage() {
  const { roles, user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", q],
    queryFn: async () => {
      let query = supabase.from("patients").select("*").order("created_at", { ascending: false }).limit(200);
      if (q.trim()) query = query.or(`full_name.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .insert({ full_name: form.full_name, birth_date: form.birth_date || null, phone: form.phone || null, address: form.address || null })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("audit_log").insert({ user_id: user.id, action: "create", entity: "patients", entity_id: data.id });
    },
    onSuccess: () => {
      toast.success("Пациент зарегистрирован");
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasAny(roles, ["registrar", "admin"])) return <p>Нет доступа к этому разделу.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        className="rounded-3xl glass p-6 shadow-xl shadow-brand/10 space-y-3 h-fit"
      >
        <h2 className="font-display text-xl font-bold">Новый пациент</h2>
        <div className="space-y-1.5"><Label>ФИО *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Дата рождения</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Телефон</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Адрес</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <Button type="submit" className="w-full" disabled={create.isPending}>Зарегистрировать</Button>
      </form>

      <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-xl font-bold">Пациенты</h2>
          <Input placeholder="Поиск по ФИО или телефону" className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>ФИО</TableHead><TableHead>Дата рождения</TableHead><TableHead>Телефон</TableHead><TableHead>Адрес</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4}>Загрузка…</TableCell></TableRow>}
            {!isLoading && patients.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground">Пациентов не найдено</TableCell></TableRow>}
            {patients.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                <TableCell>{p.birth_date ? new Date(p.birth_date).toLocaleDateString("ru-RU") : "—"}</TableCell>
                <TableCell>{p.phone || "—"}</TableCell>
                <TableCell>{p.address || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
