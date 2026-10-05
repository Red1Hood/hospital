import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY one-off seeding of test accounts. Removed after use.
export const Route = createFileRoute("/api/seed-test-users")({
  server: { handlers: { POST: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const users = [
      ["admin@hospital.test", "Админ Тестовый"],
      ["doctor@hospital.test", "Иванов Иван Петрович"],
      ["lab@hospital.test", "Смирнова Анна Олеговна"],
      ["patient@hospital.test", "Петров Пётр Сергеевич"],
    ];
    const out: Record<string, string> = {};
    for (const [email, name] of users) {
      let pw = "Hosp-Test-2026";
      let res = await supabaseAdmin.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { full_name: name } });
      if (res.error) {
        out[email + "_first"] = res.error.message;
        pw = "Hospital#2026";
        res = await supabaseAdmin.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { full_name: name } });
      }
      out[email] = res.error ? `ERROR ${res.error.message}` : `ok pw=${pw}`;
    }
    return Response.json(out);
  } } },
});
