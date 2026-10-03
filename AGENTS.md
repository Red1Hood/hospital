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
