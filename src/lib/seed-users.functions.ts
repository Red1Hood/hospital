import { createServerFn } from "@tanstack/react-start";

// TEMPORARY one-off seeding of test accounts. Removed after use.
export const seedUsers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const users = [
    ["admin@hospital.test", "Админ Тестовый"],
    ["doctor@hospital.test", "Иванов Иван Петрович"],
    ["lab@hospital.test", "Смирнова Анна Лаборант"],
    ["patient@hospital.test", "Петров Пётр Сергеевич"],
  ];
  const out: Record<string, string> = {};
  for (const [email, name] of users) {
    let res = await supabaseAdmin.auth.admin.createUser({ email, password: "12345", email_confirm: true, user_metadata: { full_name: name } });
    let pw = "12345";
    if (res.error) {
      res = await supabaseAdmin.auth.admin.createUser({ email, password: "123456", email_confirm: true, user_metadata: { full_name: name } });
      pw = "123456";
    }
    out[email] = res.error ? `ERROR ${res.error.message}` : `${res.data.user?.id} pw=${pw}`;
  }
  return out;
});
