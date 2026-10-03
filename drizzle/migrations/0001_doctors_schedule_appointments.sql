CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  specialty text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  user_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctors TO authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read doctors" ON public.doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write doctors" ON public.doctors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.doctor_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_minutes integer NOT NULL DEFAULT 20 CHECK (slot_minutes BETWEEN 5 AND 240),
  CHECK (end_time > start_time),
  UNIQUE (doctor_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_schedules TO authenticated;
GRANT ALL ON public.doctor_schedules TO service_role;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read schedules" ON public.doctor_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write schedules" ON public.doctor_schedules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TYPE public.appointment_status AS ENUM ('created','confirmed','waiting','in_progress','completed','cancelled','no_show','rescheduled');

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'created',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- No double booking: one active appointment per doctor per time
CREATE UNIQUE INDEX appointments_no_double_booking ON public.appointments (doctor_id, scheduled_at)
  WHERE status NOT IN ('cancelled','rescheduled');
CREATE INDEX appointments_patient_idx ON public.appointments (patient_id);
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_own_doctor(_doctor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.doctors WHERE id = _doctor_id AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_own_patient(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.patients WHERE id = _patient_id AND user_id = auth.uid())
$$;

CREATE POLICY "read appointments" ON public.appointments FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['registrar','admin','nurse']::public.app_role[])
  OR public.is_own_doctor(doctor_id) OR public.is_own_patient(patient_id));
CREATE POLICY "create appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND status = 'created' AND scheduled_at > now() AND (
    public.has_any_role(auth.uid(), ARRAY['registrar','admin']::public.app_role[])
    OR (public.has_role(auth.uid(),'patient') AND public.is_own_patient(patient_id))));
CREATE POLICY "update appointments" ON public.appointments FOR UPDATE TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['registrar','admin']::public.app_role[]) OR public.is_own_doctor(doctor_id));

-- Busy times for a doctor on a day (no patient data), so patients can see free slots
CREATE OR REPLACE FUNCTION public.get_busy_slots(_doctor_id uuid, _from timestamptz, _to timestamptz)
RETURNS SETOF timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT scheduled_at FROM public.appointments
  WHERE doctor_id = _doctor_id AND scheduled_at >= _from AND scheduled_at < _to
    AND status NOT IN ('cancelled','rescheduled') AND auth.uid() IS NOT NULL
$$;
GRANT EXECUTE ON FUNCTION public.get_busy_slots(uuid, timestamptz, timestamptz) TO authenticated;