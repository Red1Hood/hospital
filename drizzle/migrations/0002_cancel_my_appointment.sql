CREATE OR REPLACE FUNCTION public.cancel_my_appointment(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.appointments SET status = 'cancelled'
  WHERE id = _id AND public.is_own_patient(patient_id)
    AND status IN ('created','confirmed') AND scheduled_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Запись нельзя отменить'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.cancel_my_appointment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_appointment(uuid) TO authenticated;