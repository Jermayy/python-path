# Database migrations

Applied in filename order. Every migration must be backward compatible with the currently
deployed app (expand → migrate → contract). Apply with the Supabase CLI
(`npx supabase db push`) or the Supabase dashboard SQL editor.

Rollback for `20261123000000_initial_schema.sql` (destroys all progress data):

```sql
alter publication supabase_realtime drop table public.exercise_progress, public.activity_days;
drop function if exists public.consume_ai_quota(integer);
drop function if exists public.upsert_exercise_progress(text, text, integer, integer, timestamptz, text, timestamptz);
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.ai_usage, public.activity_days, public.exercise_progress, public.profiles;
```
