-- Astra sync: one row per sign-in (name + hot-water bottle + tea), holding that person's symptom log.
-- Safe to run in a shared Supabase project (it shares Good Word Charlie's and DuoDisco's): everything is prefixed astra_
-- and touches no other tables. Run it once in Supabase → SQL Editor. Running it again is harmless.
--
-- How it stays private:
--  * The sign-in is never stored or sent. The app sends a SHA-256 hash of it, which is the row's id.
--  * Row level security is on with NO policies, so the table can't be read or listed directly.
--  * The app can only call the two functions below, and only for the hash of a phrase it knows.

create table if not exists public.astra_sync (
  id          text primary key,              -- sha256 of the sign-in
  state       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.astra_sync enable row level security;
revoke all on public.astra_sync from anon, authenticated;

-- Load by phrase hash. Returns null if nothing has been saved under that phrase.
create or replace function public.astra_load(p_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('state', state, 'updated_at', updated_at)
  from public.astra_sync
  where id = p_id and length(p_id) = 64;
$$;

-- Save by phrase hash. p_create = true starts a new row and refuses to overwrite an existing one.
create or replace function public.astra_save(p_id text, p_state jsonb, p_create boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(p_id) <> 64 then return false; end if;
  if pg_column_size(p_state) > 2000000 then return false; end if;
  if p_create then
    insert into public.astra_sync (id, state) values (p_id, coalesce(p_state, '{}'::jsonb))
    on conflict (id) do nothing;
    return found;
  end if;
  update public.astra_sync set state = coalesce(p_state, state), updated_at = now() where id = p_id;
  return found;
end;
$$;

revoke all on function public.astra_load(text) from public;
revoke all on function public.astra_save(text, jsonb, boolean) from public;
grant execute on function public.astra_load(text) to anon;
grant execute on function public.astra_save(text, jsonb, boolean) to anon;

-- Make the new functions available straight away.
notify pgrst, 'reload schema';
