-- Notifications are written only by the trainer_links trigger below; users may read, mark read and delete their own.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  actor_role text not null,
  actor_first_name text null,
  actor_last_name text null,
  actor_email text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  constraint notifications_kind_check check (
    kind in ('link_requested', 'link_accepted', 'link_declined', 'link_cancelled', 'link_removed')
  ),
  constraint notifications_actor_role_check check (actor_role in ('trainer', 'trainee'))
);

create index notifications_recipient_created_idx
on public.notifications (recipient_id, created_at desc, id desc);

create index notifications_recipient_unread_idx
on public.notifications (recipient_id, created_at desc, id desc)
where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select_own
on public.notifications
for select
to authenticated
using (recipient_id = auth.uid());

create policy notifications_update_own
on public.notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create policy notifications_delete_own
on public.notifications
for delete
to authenticated
using (recipient_id = auth.uid());

-- No insert grant: users cannot create notifications. Only read_at is updatable.
revoke all on public.notifications from anon, authenticated;

grant select, delete on public.notifications to authenticated;

grant update (read_at) on public.notifications to authenticated;

-- The actor is the JWT caller. A null caller (profile cascade delete, service-role write) or a caller on
-- neither side of the link writes no notification.
create function public.notify_trainer_link_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_trainer_id uuid;
  v_trainee_id uuid;
  v_actor_role text;
  v_recipient_id uuid;
  v_kind text;
  v_first_name text;
  v_last_name text;
  v_email text;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_trainer_id := old.trainer_id;
    v_trainee_id := old.trainee_id;
  else
    v_trainer_id := new.trainer_id;
    v_trainee_id := new.trainee_id;
  end if;

  if v_actor_id = v_trainer_id then
    v_actor_role := 'trainer';
    v_recipient_id := v_trainee_id;
  elsif v_actor_id = v_trainee_id then
    v_actor_role := 'trainee';
    v_recipient_id := v_trainer_id;
  else
    return null;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'pending' and v_actor_role = 'trainer' then
      v_kind := 'link_requested';
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status = 'accepted' and v_actor_role = 'trainee' then
      v_kind := 'link_accepted';
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'pending' then
      v_kind := case v_actor_role when 'trainee' then 'link_declined' else 'link_cancelled' end;
    elsif old.status = 'accepted' then
      v_kind := 'link_removed';
    end if;
  end if;

  if v_kind is null then
    return null;
  end if;

  select p.first_name, p.last_name
  into v_first_name, v_last_name
  from public.profiles as p
  where p.id = v_actor_id;

  select pg_catalog.lower(pg_catalog.btrim(u.email))
  into v_email
  from auth.users as u
  where u.id = v_actor_id;

  -- A user without an email cannot be named; the link change still goes through.
  if v_email is null or v_email = '' then
    return null;
  end if;

  insert into public.notifications (recipient_id, kind, actor_role, actor_first_name, actor_last_name, actor_email)
  values (v_recipient_id, v_kind, v_actor_role, v_first_name, v_last_name, v_email);

  return null;
end;
$$;

revoke all on function public.notify_trainer_link_change() from public, anon, authenticated;

create trigger trainer_links_notify
after insert or update of status or delete on public.trainer_links
for each row
execute function public.notify_trainer_link_change();
