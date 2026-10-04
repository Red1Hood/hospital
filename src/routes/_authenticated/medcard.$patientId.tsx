import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MedcardView } from "@/components/MedcardView";
import { ReferralForm } from "@/components/ReferralForm";

export const Route = createFileRoute("/_authenticated/medcard/$patientId")({
  head: () => ({ meta: [{ title: "Медицинская карта — АИС «Больница»" }] }),
  component: Page,
});

function Page() {
  const { patientId } = Route.useParams();
  const { user, roles } = Route.useRouteContext();
  const { data: myDoctor } = useQuery({
    queryKey: ["my-doctor", user.id],
    enabled: roles.includes("doctor"),
    queryFn: async () => (await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle()).data,
  });
  return (
    <div className="space-y-6">
      <Link to="/medcard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Все карты</Link>
      <MedcardView patientId={patientId} />
      {myDoctor && <ReferralForm patientId={patientId} doctorId={myDoctor.id} />}
    </div>
  );
}
