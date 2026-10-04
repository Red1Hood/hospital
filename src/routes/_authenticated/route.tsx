import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Users, UserCog, LogOut, Stethoscope, CalendarPlus, ClipboardList, FolderHeart, FlaskConical, BedDouble, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, hasAny, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      supabase.from("profiles").select("full_name").eq("user_id", data.user.id).maybeSingle(),
    ]);
    const roles = (roleRows ?? []).map((r) => r.role as AppRole);
    return { user: data.user, roles, fullName: profile?.full_name || data.user.email || "" };
  },
  component: Layout,
});

const NAV: { to: string; label: string; icon: typeof Users; roles: AppRole[] | null }[] = [
  { to: "/dashboard", label: "Главная", icon: LayoutDashboard, roles: null },
  { to: "/patients", label: "Пациенты", icon: Users, roles: ["registrar", "admin"] },
  { to: "/booking", label: "Запись на приём", icon: CalendarPlus, roles: ["registrar", "admin", "patient"] },
  { to: "/my-appointments", label: "Мои приёмы", icon: ClipboardList, roles: ["doctor"] },
  { to: "/medcard", label: "Медкарты", icon: FolderHeart, roles: ["doctor", "nurse", "admin", "patient"] },
  { to: "/lab", label: "Лаборатория", icon: FlaskConical, roles: ["lab"] },
  { to: "/doctors", label: "Врачи и отделения", icon: Stethoscope, roles: ["admin"] },
  { to: "/users", label: "Пользователи", icon: UserCog, roles: ["admin"] },
];

function Layout() {
  const { roles, fullName } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist via-background to-mist font-body text-ink">
      <header className="border-b border-border/60 glass sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-6">
          <Link to="/dashboard" className="font-display font-bold">Больница<span className="text-brand">.АИС</span></Link>
          <nav className="flex flex-wrap gap-1 flex-1">
            {NAV.filter((n) => !n.roles || hasAny(roles, n.roles)).map((n) => (
              <Link key={n.to} to={n.to} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-brand/10 text-brand-deep font-semibold" }}>
                <n.icon className="size-4" />{n.label}
              </Link>
            ))}
          </nav>
          <div className="text-right text-xs leading-tight">
            <p className="font-semibold">{fullName}</p>
            <p className="text-muted-foreground">{roles.map((r) => ROLE_LABELS[r]).join(", ") || "Без роли"}</p>
          </div>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground" aria-label="Выйти"><LogOut className="size-4" /></button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8"><Outlet /></main>
    </div>
  );
}
