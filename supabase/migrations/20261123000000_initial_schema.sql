-- Python Path initial schema.
-- Every table has RLS enabled; users can only see and change their own rows.
-- Progress writes go through upsert_exercise_progress, which applies the same conflict-free
-- merge as src/modules/progress/merge.ts so concurrent devices never lose progress.

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- exercise_progress
create table public.exercise_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null check (exercise_id ~ '^[a-z0-9-]{1,80}$'),
  status text not null check (status in ('attempted', 'completed')),
  attempts integer not null default 0 check (attempts between 0 and 100000),
  hints_used integer not null default 0 check (hints_used between 0 and 1000),
  completed_at timestamptz,
  code text check (char_length(code) <= 20000),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id),
  check (status <> 'completed' or completed_at is not null)
);
alter table public.exercise_progress enable row level security;
-- Realtime needs the full old row for UPDATE events under RLS.
alter table public.exercise_progress replica identity full;

create policy "progress: read own" on public.exercise_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress: insert own" on public.exercise_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress: update own" on public.exercise_progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress: delete own" on public.exercise_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

create function public.upsert_exercise_progress(
  p_exercise_id text,
  p_status text,
  p_attempts integer,
  p_hints_used integer,
  p_completed_at timestamptz,
  p_code text,
  p_updated_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  -- Don't let a client clock far in the future pin its code as "newest" forever.
  v_updated timestamptz := least(p_updated_at, now() + interval '5 minutes');
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.exercise_progress as ep
    (user_id, exercise_id, status, attempts, hints_used, completed_at, code, updated_at)
  values
    (v_uid, p_exercise_id, p_status, p_attempts, p_hints_used,
     case when p_status = 'completed' then coalesce(p_completed_at, now()) end,
     p_code, v_updated)
  on conflict (user_id, exercise_id) do update set
    status = case when ep.status = 'completed' or excluded.status = 'completed'
                  then 'completed' else 'attempted' end,
    attempts = greatest(ep.attempts, excluded.attempts),
    hints_used = greatest(ep.hints_used, excluded.hints_used),
    completed_at = case
      when ep.completed_at is null then excluded.completed_at
      when excluded.completed_at is null then ep.completed_at
      else least(ep.completed_at, excluded.completed_at) end,
    code = case
      when excluded.updated_at > ep.updated_at then coalesce(excluded.code, ep.code)
      when excluded.updated_at < ep.updated_at then coalesce(ep.code, excluded.code)
      else greatest(ep.code, excluded.code) end,
    updated_at = greatest(ep.updated_at, excluded.updated_at);
end;
$$;
revoke all on function public.upsert_exercise_progress(text, text, integer, integer, timestamptz, text, timestamptz) from public, anon;
grant execute on function public.upsert_exercise_progress(text, text, integer, integer, timestamptz, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------- activity_days (streaks)
create table public.activity_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Learner's local calendar day; bounded to stop junk data.
  day date not null check (day between date '2024-01-01' and (current_date + 2)),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.activity_days enable row level security;

create policy "activity: read own" on public.activity_days
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "activity: insert own" on public.activity_days
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activity: delete own" on public.activity_days
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.activity_days alter column user_id set default auth.uid();

-- ---------------------------------------------------------------- ai_usage (per-user daily quota)
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage: read own" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);
-- No write policies: only consume_ai_quota (security definer) writes here.

create function public.consume_ai_quota(p_limit integer)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_used integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid limit' using errcode = '22023';
  end if;

  insert into public.ai_usage as u (user_id, day, requests)
  values (v_uid, current_date, 1)
  on conflict (user_id, day) do update
    set requests = u.requests + 1
    where u.requests < p_limit
  returning u.requests into v_used;

  if v_used is null then
    select u.requests into v_used from public.ai_usage u where u.user_id = v_uid and u.day = current_date;
    return query select false, v_used;
  else
    return query select true, v_used;
  end if;
end;
$$;
revoke all on function public.consume_ai_quota(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;

-- ---------------------------------------------------------------- realtime (live sync across devices)
alter publication supabase_realtime add table public.exercise_progress, public.activity_days;
