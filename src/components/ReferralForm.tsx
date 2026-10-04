import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const REFERRAL_TYPES = ["Общий анализ крови", "Биохимия крови", "Общий анализ мочи", "Рентген", "УЗИ", "ЭКГ", "МРТ", "КТ"];

export function ReferralForm({ patientId, doctorId, appointmentId }: { patientId: string; doctorId: string; appointmentId?: string }) {
  const qc = useQueryClient();
  const [type, setType] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("referrals").insert({ patient_id: patientId, doctor_id: doctorId, appointment_id: appointmentId ?? null, type, comment: comment || null });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Направление создано");
    setType(""); setComment("");
    qc.invalidateQueries({ queryKey: ["medcard"] });
  }

  return (
    <form onSubmit={submit} className="rounded-3xl glass p-6 shadow-xl shadow-brand/10 space-y-3">
      <h2 className="font-display text-xl font-bold">Направление на обследование</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Вид исследования *</Label>
          <Input required list="ref-types" value={type} onChange={(e) => setType(e.target.value)} placeholder="Например, ОАК" />
          <datalist id="ref-types">{REFERRAL_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <div className="space-y-1.5"><Label>Комментарий</Label><Input value={comment} onChange={(e) => setComment(e.target.value)} /></div>
      </div>
      <Button type="submit" disabled={busy}>Выписать направление</Button>
    </form>
  );
}
