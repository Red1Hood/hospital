import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ALL_ROLES, ROLE_LABELS, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Пользователи — АИС «Больница»" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { roles } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, phone").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      return (p.data ?? []).map((u) => ({ ...u, roles: (r.data ?? []).filter((x) => x.user_id === u.user_id).map((x) => x.role as AppRole) }));
    },
  });

  async function toggle(userId: string, role: AppRole, on: boolean) {
    const { error } = on
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  if (!roles.includes("admin")) return <p>Нет доступа к этому разделу.</p>;

  return (
    <div className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
      <h2 className="font-display text-xl font-bold mb-1">Пользователи и роли</h2>
      <p className="text-sm text-muted-foreground mb-5">Сотрудник регистрируется сам, затем вы назначаете ему роль.</p>
      <div className="space-y-3">
        {data?.map((u) => (
          <div key={u.user_id} className="rounded-2xl glass-soft p-4 flex flex-wrap items-center gap-3">
            <div className="min-w-48 flex-1">
              <p className="font-semibold">{u.full_name || "Без имени"}</p>
              <p className="text-xs text-muted-foreground">{u.phone || ""}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ROLES.map((role) => {
                const on = u.roles.includes(role);
                return (
                  <button key={role} onClick={() => toggle(u.user_id, role, on)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${on ? "bg-brand text-primary-foreground border-brand" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {ROLE_LABELS[role]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
