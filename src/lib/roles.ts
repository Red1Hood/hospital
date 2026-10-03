import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABELS: Record<AppRole, string> = {
  registrar: "Регистратор",
  doctor: "Врач",
  nurse: "Медсестра",
  lab: "Лаборант",
  admin: "Администратор",
  manager: "Руководитель",
  patient: "Пациент",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

export function hasAny(roles: AppRole[], allowed: AppRole[]) {
  return roles.some((r) => allowed.includes(r));
}
