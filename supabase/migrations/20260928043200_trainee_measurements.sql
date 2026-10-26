create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5,1) not null,
  chest_cm numeric(5,1) not null,
  waist_cm numeric(5,1) not null,
  arms_cm numeric(5,1) not null,
  thigh_cm numeric(5,1) not null,
  calf_cm numeric(5,1) not null,
  hips_cm numeric(5,1) not null,
  navel_cm numeric(5,1) not null,
  note text null,
  created_at timestamptz not null default now(),
  constraint measurements_weight_kg_check check (weight_kg between 20 and 400),
  constraint measurements_chest_cm_check check (chest_cm between 10 and 300),
  constraint measurements_waist_cm_check check (waist_cm between 10 and 300),
  constraint measurements_arms_cm_check check (arms_cm between 10 and 300),
  constraint measurements_thigh_cm_check check (thigh_cm between 10 and 300),
  constraint measurements_calf_cm_check check (calf_cm between 10 and 300),
  constraint measurements_hips_cm_check check (hips_cm between 10 and 300),
  constraint measurements_navel_cm_check check (navel_cm between 10 and 300),
  constraint measurements_note_check check (note is null or char_length(note) <= 1000)
);

create index measurements_trainee_id_measured_on_created_at_idx
on public.measurements (trainee_id, measured_on, created_at);

alter table public.measurements enable row level security;

create policy measurements_select_own
on public.measurements
for select
to authenticated
using (auth.uid() = trainee_id);

create policy measurements_insert_own_trainee
on public.measurements
for insert
to authenticated
with check (auth.uid() = trainee_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'trainee'));

revoke all on public.measurements from anon, authenticated;

grant select, insert on public.measurements to authenticated;
