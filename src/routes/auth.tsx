import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход — АИС «Больница»" },
      { name: "description", content: "Вход и регистрация в информационной системе больницы." },
      { property: "og:title", content: "Вход — АИС «Больница»" },
      { property: "og:description", content: "Вход и регистрация в информационной системе больницы." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: fullName, phone } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard" });
        else toast.success("Проверьте почту и подтвердите регистрацию");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-mist via-background to-mist px-4 font-body text-ink">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl glass shadow-xl shadow-brand/10 p-8 space-y-4">
        <Link to="/" className="font-display text-lg font-bold">Больница<span className="text-brand">.АИС</span></Link>
        <h1 className="font-display text-2xl font-bold">{mode === "in" ? "Вход в систему" : "Регистрация пациента"}</h1>
        {mode === "up" && (
          <>
            <div className="space-y-1.5"><Label>ФИО</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Телефон</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </>
        )}
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Пароль</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Войти" : "Зарегистрироваться"}</Button>
        <button type="button" className="text-sm text-brand w-full" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </form>
    </div>
  );
}
