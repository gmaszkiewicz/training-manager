grant update on public.measurements to authenticated;

create policy measurements_update_own_trainee
on public.measurements
for update
to authenticated
using (auth.uid() = trainee_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'trainee'))
with check (auth.uid() = trainee_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'trainee'));
