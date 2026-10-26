grant delete on public.measurements to authenticated;

create policy measurements_delete_own_trainee
on public.measurements
for delete
to authenticated
using (auth.uid() = trainee_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'trainee'));
