create function public.search_unlinked_trainee_emails(p_query text)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainer_id uuid;
  v_query text;
begin
  v_trainer_id := auth.uid();

  if not exists (
    select 1
    from public.profiles
    where id = v_trainer_id
      and role = 'trainer'
  ) then
    return;
  end if;

  v_query := pg_catalog.lower(pg_catalog.btrim(p_query));

  if v_query is null or v_query = '' then
    return;
  end if;

  return query
  select pg_catalog.lower(pg_catalog.btrim(u.email))
  from auth.users as u
  inner join public.profiles as p
    on p.id = u.id
   and p.role = 'trainee'
  where pg_catalog.strpos(pg_catalog.lower(pg_catalog.btrim(u.email)), v_query) > 0
    and not exists (
      select 1
      from public.trainer_links as l
      where l.trainer_id = v_trainer_id
        and l.trainee_id = u.id
    )
  order by pg_catalog.lower(pg_catalog.btrim(u.email))
  limit 10;
end;
$$;

revoke all on function public.search_unlinked_trainee_emails(text) from public, anon;

grant execute on function public.search_unlinked_trainee_emails(text) to authenticated;
