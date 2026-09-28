alter table public.profiles drop constraint profiles_role_check;

alter table public.profiles
add constraint profiles_role_check check (role in ('trainee', 'trainer'));

drop policy profiles_insert_own_trainee on public.profiles;

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = id and role in ('trainee', 'trainer'));
