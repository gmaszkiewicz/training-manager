alter table public.measurements
alter column measured_on type timestamp without time zone
using measured_on::timestamp;

with recursive ordered as (
  select
    id,
    trainee_id,
    candidate,
    row_number() over (
      partition by trainee_id
      order by candidate, id
    ) as rn
  from (
    select
      id,
      trainee_id,
      date_trunc('minute', measured_on + (created_at at time zone 'utc')::time) as candidate
    from public.measurements
  ) as candidates
),
assigned as (
  select id, trainee_id, candidate as assigned_on, rn
  from ordered
  where rn = 1
  union all
  select
    o.id,
    o.trainee_id,
    case
      when o.candidate > a.assigned_on then o.candidate
      else a.assigned_on + interval '1 minute'
    end as assigned_on,
    o.rn
  from ordered o
  join assigned a on a.trainee_id = o.trainee_id and o.rn = a.rn + 1
)
update public.measurements as m
set measured_on = a.assigned_on
from assigned a
where m.id = a.id;

drop index public.measurements_trainee_id_measured_on_created_at_idx;

create unique index measurements_trainee_id_measured_on_key
on public.measurements (trainee_id, measured_on);
