-- Existing links backfill as accepted; new links start pending until the trainee accepts.
alter table public.trainer_links
add column status text not null default 'accepted';

alter table public.trainer_links
add constraint trainer_links_status_check check (status in ('pending', 'accepted'));

alter table public.trainer_links
alter column status set default 'pending';

create index trainer_links_trainee_id_idx on public.trainer_links (trainee_id);

-- Kept for the previous Worker during the deploy window; it can no longer create an accepted link.
create or replace function public.link_trainee_by_email(p_email text)
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

  insert into public.trainer_links (trainer_id, trainee_id, email, status)
  values (v_trainer_id, v_trainee_id, v_email, 'pending')
  on conflict (trainer_id, trainee_id) do nothing;

  return v_trainee_id;
end;
$$;

revoke all on function public.link_trainee_by_email(text) from public, anon;

grant execute on function public.link_trainee_by_email(text) to authenticated;

drop policy measurements_select_linked_trainer on public.measurements;

create policy measurements_select_linked_trainer
on public.measurements
for select
to authenticated
using (
  exists (
    select 1
    from public.trainer_links l
    where l.trainer_id = auth.uid()
      and l.trainee_id = measurements.trainee_id
      and l.status = 'accepted'
  )
);

create function public.request_trainee_link(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainer_id uuid;
  v_email text;
  v_trainee_id uuid;
  v_status text;
begin
  v_trainer_id := auth.uid();

  if not exists (
    select 1
    from public.profiles
    where id = v_trainer_id
      and role = 'trainer'
  ) then
    return 'not_found';
  end if;

  v_email := pg_catalog.lower(pg_catalog.btrim(p_email));

  if v_email is null or v_email = '' then
    return 'not_found';
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
    return 'not_found';
  end if;

  insert into public.trainer_links (trainer_id, trainee_id, email, status)
  values (v_trainer_id, v_trainee_id, v_email, 'pending')
  on conflict (trainer_id, trainee_id) do nothing;

  if found then
    return 'sent';
  end if;

  select l.status
  into v_status
  from public.trainer_links as l
  where l.trainer_id = v_trainer_id
    and l.trainee_id = v_trainee_id;

  if v_status = 'accepted' then
    return 'linked';
  end if;

  return 'pending';
end;
$$;

revoke all on function public.request_trainee_link(text) from public, anon;

grant execute on function public.request_trainee_link(text) to authenticated;

create function public.list_trainer_collaborations(p_page integer, p_size integer)
returns table (
  trainee_id uuid,
  email text,
  first_name text,
  last_name text,
  status text,
  linked_at timestamptz,
  total bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainer_id uuid;
begin
  v_trainer_id := auth.uid();

  if p_page is null or p_page < 1 or p_size is null or p_size < 1 or p_size > 50 then
    raise exception 'invalid page' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_trainer_id
      and p.role = 'trainer'
  ) then
    return;
  end if;

  return query
  select
    l.trainee_id,
    l.email,
    p.first_name,
    p.last_name,
    l.status,
    l.linked_at,
    pg_catalog.count(*) over ()
  from public.trainer_links as l
  inner join public.profiles as p
    on p.id = l.trainee_id
  where l.trainer_id = v_trainer_id
  order by (l.status = 'pending') desc, l.linked_at desc, l.email
  offset (p_page - 1) * p_size
  limit p_size;
end;
$$;

revoke all on function public.list_trainer_collaborations(integer, integer) from public, anon;

grant execute on function public.list_trainer_collaborations(integer, integer) to authenticated;

create function public.list_trainee_collaborations(p_page integer, p_size integer)
returns table (
  trainer_id uuid,
  email text,
  first_name text,
  last_name text,
  status text,
  linked_at timestamptz,
  total bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainee_id uuid;
begin
  v_trainee_id := auth.uid();

  if p_page is null or p_page < 1 or p_size is null or p_size < 1 or p_size > 50 then
    raise exception 'invalid page' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_trainee_id
      and p.role = 'trainee'
  ) then
    return;
  end if;

  return query
  select
    l.trainer_id,
    pg_catalog.lower(pg_catalog.btrim(u.email)),
    p.first_name,
    p.last_name,
    l.status,
    l.linked_at,
    pg_catalog.count(*) over ()
  from public.trainer_links as l
  inner join public.profiles as p
    on p.id = l.trainer_id
  inner join auth.users as u
    on u.id = l.trainer_id
  where l.trainee_id = v_trainee_id
  order by (l.status = 'pending') desc, l.linked_at desc, pg_catalog.lower(pg_catalog.btrim(u.email))
  offset (p_page - 1) * p_size
  limit p_size;
end;
$$;

revoke all on function public.list_trainee_collaborations(integer, integer) from public, anon;

grant execute on function public.list_trainee_collaborations(integer, integer) to authenticated;

create function public.accept_trainer_link(p_trainer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainee_id uuid;
begin
  v_trainee_id := auth.uid();

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_trainee_id
      and p.role = 'trainee'
  ) then
    return false;
  end if;

  update public.trainer_links as l
  set status = 'accepted',
      linked_at = pg_catalog.now()
  where l.trainer_id = p_trainer_id
    and l.trainee_id = v_trainee_id
    and l.status = 'pending';

  return found;
end;
$$;

revoke all on function public.accept_trainer_link(uuid) from public, anon;

grant execute on function public.accept_trainer_link(uuid) to authenticated;

-- One removal covers cancel and unlink (trainer) and decline and remove (trainee), at any status.
create function public.remove_trainer_link(p_other_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_role text;
begin
  v_caller_id := auth.uid();

  select p.role
  into v_role
  from public.profiles as p
  where p.id = v_caller_id;

  if v_role = 'trainer' then
    delete from public.trainer_links as l
    where l.trainer_id = v_caller_id
      and l.trainee_id = p_other_id;
  elsif v_role = 'trainee' then
    delete from public.trainer_links as l
    where l.trainer_id = p_other_id
      and l.trainee_id = v_caller_id;
  else
    return false;
  end if;

  return found;
end;
$$;

revoke all on function public.remove_trainer_link(uuid) from public, anon;

grant execute on function public.remove_trainer_link(uuid) to authenticated;
