create table public.trainer_links (
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  linked_at timestamptz not null default now(),
  primary key (trainer_id, trainee_id),
  constraint trainer_links_trainer_id_trainee_id_check check (trainer_id <> trainee_id),
  constraint trainer_links_email_check check (char_length(email) between 3 and 320)
);

alter table public.trainer_links enable row level security;

create policy trainer_links_select_own
on public.trainer_links
for select
to authenticated
using (auth.uid() = trainer_id);

revoke all on public.trainer_links from anon, authenticated;

grant select on public.trainer_links to authenticated;

create function public.link_trainee_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainer_id uuid;
  v_email text;
  v_trainee_id uuid;
begin
  v_trainer_id := auth.uid();

  if not exists (
    select 1
    from public.profiles
    where id = v_trainer_id
      and role = 'trainer'
  ) then
    return null;
  end if;

  v_email := pg_catalog.lower(pg_catalog.btrim(p_email));

  if v_email is null or v_email = '' then
    return null;
  end if;

  select u.id
  into v_trainee_id
  from auth.users as u
  where pg_catalog.lower(pg_catalog.btrim(u.email)) = v_email;

  if v_trainee_id is null or not exists (
    select 1
    from public.profiles
    where id = v_trainee_id
      and role = 'trainee'
  ) then
    return null;
  end if;

  insert into public.trainer_links (trainer_id, trainee_id, email)
  values (v_trainer_id, v_trainee_id, v_email)
  on conflict (trainer_id, trainee_id) do nothing;

  return v_trainee_id;
end;
$$;

revoke all on function public.link_trainee_by_email(text) from public, anon;

grant execute on function public.link_trainee_by_email(text) to authenticated;

create policy measurements_select_linked_trainer
on public.measurements
for select
to authenticated
using (exists (select 1 from public.trainer_links l where l.trainer_id = auth.uid() and l.trainee_id = measurements.trainee_id));
