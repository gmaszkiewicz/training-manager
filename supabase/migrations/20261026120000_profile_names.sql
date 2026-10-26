alter table public.profiles
add column first_name text null,
add column last_name text null;

alter table public.profiles
add constraint profiles_first_name_length check (char_length(first_name) between 1 and 50);

alter table public.profiles
add constraint profiles_last_name_length check (char_length(last_name) between 1 and 50);

grant update (first_name, last_name) on public.profiles to authenticated;

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
