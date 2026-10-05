CREATE TYPE public.hospitalization_status AS ENUM ('awaiting','admitted','transferred','discharged');

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  number text NOT NULL,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 50),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write rooms" ON public.rooms FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  number text NOT NULL,
  is_occupied boolean NOT NULL DEFAULT false,
  UNIQUE (room_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beds TO authenticated;
GRANT ALL ON public.beds TO service_role;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read beds" ON public.beds FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write beds" ON public.beds FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.hospitalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  bed_id uuid NOT NULL REFERENCES public.beds(id),
  admitted_at timestamptz NOT NULL DEFAULT now(),
  discharged_at timestamptz,
  status public.hospitalization_status NOT NULL DEFAULT 'admitted',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX hospitalizations_one_active_per_bed ON public.hospitalizations(bed_id) WHERE status <> 'discharged';
CREATE UNIQUE INDEX hospitalizations_one_active_per_patient ON public.hospitalizations(patient_id) WHERE status <> 'discharged';
GRANT SELECT, INSERT, UPDATE ON public.hospitalizations TO authenticated;
GRANT ALL ON public.hospitalizations TO service_role;
ALTER TABLE public.hospitalizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read hospitalizations" ON public.hospitalizations FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['registrar','admin','nurse','doctor']::public.app_role[]) OR public.is_own_patient(patient_id));
CREATE POLICY "create hospitalizations" ON public.hospitalizations FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['registrar','admin','doctor']::public.app_role[]) AND created_by = auth.uid() AND status <> 'discharged');
CREATE POLICY "update hospitalizations" ON public.hospitalizations FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['registrar','admin','doctor']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.hospitalization_sync_beds()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'discharged' AND (NEW.status = 'discharged' OR NEW.bed_id <> OLD.bed_id) THEN
      UPDATE public.beds SET is_occupied = false WHERE id = OLD.bed_id;
    END IF;
  END IF;
  IF NEW.status <> 'discharged' THEN
    UPDATE public.beds SET is_occupied = true WHERE id = NEW.bed_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.hospitalization_before()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'discharged' THEN
    RAISE EXCEPTION 'Пациент уже выписан';
  END IF;
  IF NEW.status = 'discharged' AND NEW.discharged_at IS NULL THEN NEW.discharged_at := now(); END IF;
  IF TG_OP = 'UPDATE' AND NEW.bed_id <> OLD.bed_id AND NEW.status <> 'discharged' THEN NEW.status := 'transferred'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER hospitalizations_before BEFORE INSERT OR UPDATE ON public.hospitalizations FOR EACH ROW EXECUTE FUNCTION public.hospitalization_before();
CREATE TRIGGER hospitalizations_sync_beds AFTER INSERT OR UPDATE ON public.hospitalizations FOR EACH ROW EXECUTE FUNCTION public.hospitalization_sync_beds();

CREATE OR REPLACE FUNCTION public.report_stats(_from timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]) THEN
    RAISE EXCEPTION 'Нет доступа';
  END IF;
  SELECT jsonb_build_object(
    'appointments', (SELECT count(*) FROM appointments WHERE scheduled_at >= _from AND scheduled_at < now() + interval '1 day' AND status NOT IN ('cancelled','rescheduled')),
    'hospitalizations', (SELECT count(*) FROM hospitalizations WHERE admitted_at >= _from),
    'beds_total', (SELECT count(*) FROM beds),
    'beds_occupied', (SELECT count(*) FROM beds WHERE is_occupied),
    'by_day', COALESCE((SELECT jsonb_agg(jsonb_build_object('day', d::date, 'appointments',
        (SELECT count(*) FROM appointments a WHERE a.scheduled_at::date = d::date AND a.status NOT IN ('cancelled','rescheduled')),
        'hospitalizations', (SELECT count(*) FROM hospitalizations h WHERE h.admitted_at::date = d::date)) ORDER BY d)
      FROM generate_series(_from::date, now()::date, interval '1 day') d), '[]'::jsonb),
    'by_doctor', COALESCE((SELECT jsonb_agg(jsonb_build_object('doctor', x.full_name, 'count', x.c) ORDER BY x.c DESC)
      FROM (SELECT d.full_name, count(a.id) c FROM doctors d LEFT JOIN appointments a ON a.doctor_id = d.id
            AND a.scheduled_at >= _from AND a.status NOT IN ('cancelled','rescheduled') GROUP BY d.id, d.full_name) x), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.report_stats(timestamptz) TO authenticated;