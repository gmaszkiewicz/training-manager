-- Distinct days with at least one entry, oldest first, for the chart period picker. One array value, so a long
-- journal is never cut at PostgREST's max_rows and never paged row by row.
create function public.measurement_days(p_trainee_id uuid)
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    pg_catalog.array_agg(distinct pg_catalog.to_char(m.measured_on, 'YYYY-MM-DD') order by pg_catalog.to_char(m.measured_on, 'YYYY-MM-DD')),
    '{}'::text[]
  )
  from public.measurements as m
  where m.trainee_id = p_trainee_id
$$;

revoke all on function public.measurement_days(uuid) from public, anon;

grant execute on function public.measurement_days(uuid) to authenticated;
