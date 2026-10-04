CREATE TYPE public.referral_status AS ENUM ('open','completed','cancelled');

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  type text NOT NULL,
  comment text,
  status public.referral_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX referrals_patient_idx ON public.referrals(patient_id);
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read referrals" ON public.referrals FOR SELECT TO authenticated USING (
  public.can_view_medcard(patient_id) OR public.has_role(auth.uid(),'lab'));
CREATE POLICY "doctor creates referral" ON public.referrals FOR INSERT TO authenticated WITH CHECK (
  public.is_own_doctor(doctor_id) AND public.doctor_has_patient(patient_id) AND status = 'open');
CREATE POLICY "update referral" ON public.referrals FOR UPDATE TO authenticated USING (
  public.is_own_doctor(doctor_id) OR public.has_role(auth.uid(),'lab'));

CREATE OR REPLACE FUNCTION public.referral_patient(_referral_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT patient_id FROM public.referrals WHERE id = _referral_id
$$;

CREATE TABLE public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  result_text text,
  result_file_url text,
  entered_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (result_text IS NOT NULL OR result_file_url IS NOT NULL)
);
GRANT SELECT, INSERT ON public.lab_results TO authenticated;
GRANT ALL ON public.lab_results TO service_role;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read lab results" ON public.lab_results FOR SELECT TO authenticated USING (
  public.can_view_medcard(public.referral_patient(referral_id)) OR public.has_role(auth.uid(),'lab'));
CREATE POLICY "lab enters results" ON public.lab_results FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'lab') AND entered_by = auth.uid());

CREATE OR REPLACE FUNCTION public.lab_result_close_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.referrals SET status = 'completed' WHERE id = NEW.referral_id;
  RETURN NEW;
END $$;
CREATE TRIGGER lab_results_close AFTER INSERT ON public.lab_results
  FOR EACH ROW EXECUTE FUNCTION public.lab_result_close_referral();

-- Files stored as <referral_id>/<file>
CREATE OR REPLACE FUNCTION public.can_view_lab_file(_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _folder text := split_part(_path, '/', 1);
BEGIN
  IF public.has_role(auth.uid(),'lab') THEN RETURN true; END IF;
  IF _folder !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
  RETURN public.can_view_medcard(public.referral_patient(_folder::uuid));
END $$;
CREATE POLICY "lab uploads results" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lab-results' AND public.has_role(auth.uid(),'lab'));
CREATE POLICY "view lab result files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lab-results' AND public.can_view_lab_file(name));