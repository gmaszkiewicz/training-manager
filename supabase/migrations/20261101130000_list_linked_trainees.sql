-- The calling trainer's accepted trainees with their names, for /measurements: the picker and the tile headings
-- ("Measurements for A. Lovelace (ada@example.com)"). A trainer reads no other profile column of a trainee, and
-- profiles_select_own still keeps every direct profile read to the caller's own row.
-- Additive: the previous Worker keeps reading trainer_links directly.
create function public.list_linked_trainees()
returns table (
  trainee_id uuid,
  email text,
  first_name text,
  last_name text,
  linked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_trainer_id uuid;
begin
  v_trainer_id := auth.uid();

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
    l.linked_at
  from public.trainer_links as l
  inner join public.profiles as p
    on p.id = l.trainee_id
  where l.trainer_id = v_trainer_id
    and l.status = 'accepted';
end;
$$;

revoke all on function public.list_linked_trainees() from public, anon;

grant execute on function public.list_linked_trainees() to authenticated;
