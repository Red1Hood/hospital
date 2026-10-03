import { createFileRoute, Link } from "@tanstack/react-router";
import { ROLE_LABELS } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Рабочий стол — АИС «Больница»" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { roles, fullName } = Route.useRouteContext();
  return (
    <div className="space-y-6">
      <div className="rounded-3xl glass p-8 shadow-xl shadow-brand/10">
        <p className="text-sm text-muted-foreground">Добро пожаловать</p>
        <h1 className="font-display text-3xl font-bold">{fullName}</h1>
        <p className="mt-2 text-sm">Ваши роли: <b>{roles.map((r) => ROLE_LABELS[r]).join(", ") || "не назначены"}</b></p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(roles.includes("registrar") || roles.includes("admin")) && (
          <Link to="/patients" className="rounded-2xl glass-soft p-5 hover:-translate-y-0.5 transition-transform">
            <p className="font-display font-semibold">Регистрация пациентов</p>
            <p className="text-sm text-muted-foreground">Создание карточек и поиск пациентов</p>
          </Link>
        )}
        {roles.includes("admin") && (
          <Link to="/users" className="rounded-2xl glass-soft p-5 hover:-translate-y-0.5 transition-transform">
            <p className="font-display font-semibold">Пользователи и роли</p>
            <p className="text-sm text-muted-foreground">Назначение ролей сотрудникам</p>
          </Link>
        )}
      </div>
    </div>
  );
}
