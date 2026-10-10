create function public.measurement_months(p_trainee_id uuid)
returns table (measured_month text)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct pg_catalog.to_char(m.measured_on, 'YYYY-MM')
  from public.measurements as m
  where m.trainee_id = p_trainee_id
$$;

revoke all on function public.measurement_months(uuid) from public, anon;

grant execute on function public.measurement_months(uuid) to authenticated;
