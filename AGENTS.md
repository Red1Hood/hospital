<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Roles live in `user_roles` (enum `app_role`), checked via `has_role`/`has_any_role` SQL functions in RLS — never on profiles, to avoid privilege escalation.
- Signed-in pages live under `src/routes/_authenticated/`; the layout loads user + roles into route context and filters nav by role.
- Data access uses the browser Supabase client directly; RLS policies are the security boundary.
- Signup trigger: first user becomes admin; later users become patients with a linked `patients` row.
- Double booking is prevented by a partial unique index on appointments(doctor_id, scheduled_at) excluding cancelled/rescheduled; free slots come from doctor_schedules minus the security-definer get_busy_slots RPC.
- Doctors link to login accounts via doctors.user_id; doctor-scoped RLS uses is_own_doctor/is_own_patient helpers.
- Medical card access is centralised in can_view_medcard (own patient, doctor with an appointment, nurse, admin); visits/referrals/lab results reuse it in RLS.
- Lab results: inserting a lab_result auto-closes its referral via trigger; files live in the private lab-results bucket under <referral_id>/, gated by can_view_lab_file.
- Hospitalization: partial unique indexes allow one non-discharged hospitalization per bed and per patient; triggers keep beds.is_occupied in sync (discharge/transfer frees the old bed, bed change sets status transferred).
- Reports read aggregates through the security-definer report_stats RPC (admin/manager only), so managers need no row-level access to clinical tables.
- Test accounts (admin/doctor/lab/patient @hospital.test) are seeded via the auth admin API; weak passwords are rejected by leaked-password protection.
