create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  constraint profiles_role_check check (role = 'trainee')
);

alter table public.profiles enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy profiles_insert_own_trainee
on public.profiles
for insert
to authenticated
with check (auth.uid() = id and role = 'trainee');
