create function public.email_is_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as u
    where pg_catalog.lower(pg_catalog.btrim(u.email)) = pg_catalog.lower(pg_catalog.btrim(p_email))
  );
$$;

revoke all on function public.email_is_registered(text) from public, anon, authenticated;

grant execute on function public.email_is_registered(text) to anon, authenticated;
