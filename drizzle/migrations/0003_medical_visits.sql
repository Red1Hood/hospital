CREATE OR REPLACE FUNCTION public.doctor_has_patient(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id
                 WHERE a.patient_id = _patient_id AND d.user_id = auth.uid())
$$;

-- Medical card visibility: own patient, treating doctor, nurse, admin
CREATE OR REPLACE FUNCTION public.can_view_medcard(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_own_patient(_patient_id) OR public.doctor_has_patient(_patient_id)
      OR public.has_any_role(auth.uid(), ARRAY['nurse','admin']::public.app_role[])
$$;

CREATE TABLE public.medical_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  complaints text,
  examination text,
  diagnosis text,
  recommendations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.medical_visits TO authenticated;
GRANT ALL ON public.medical_visits TO service_role;
ALTER TABLE public.medical_visits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_appt_doctor(_appointment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id
                 WHERE a.id = _appointment_id AND d.user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.appt_patient(_appointment_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT patient_id FROM public.appointments WHERE id = _appointment_id
$$;

CREATE POLICY "read visits" ON public.medical_visits FOR SELECT TO authenticated USING (
  public.is_appt_doctor(appointment_id)
  OR public.can_view_medcard(public.appt_patient(appointment_id))
  OR public.has_any_role(auth.uid(), ARRAY['registrar']::public.app_role[]));
CREATE POLICY "doctor writes visit" ON public.medical_visits FOR INSERT TO authenticated WITH CHECK (public.is_appt_doctor(appointment_id));
CREATE POLICY "doctor updates visit" ON public.medical_visits FOR UPDATE TO authenticated USING (public.is_appt_doctor(appointment_id));

CREATE OR REPLACE FUNCTION public.visit_complete_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  UPDATE public.appointments SET status = 'completed' WHERE id = NEW.appointment_id AND status <> 'completed';
  RETURN NEW;
END $$;
CREATE TRIGGER medical_visits_complete BEFORE INSERT OR UPDATE ON public.medical_visits
  FOR EACH ROW EXECUTE FUNCTION public.visit_complete_appointment();

-- Doctors see only their own patients (others: registrar/admin/nurse/lab or the patient themself)
DROP POLICY "staff read patients" ON public.patients;
CREATE POLICY "read patients" ON public.patients FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['registrar','admin','nurse','lab']::public.app_role[])
  OR public.doctor_has_patient(id) OR user_id = auth.uid());