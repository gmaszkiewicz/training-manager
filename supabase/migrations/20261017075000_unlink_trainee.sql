create function public.unlink_trainee(p_trainee_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainer_id uuid;
begin
  v_trainer_id := auth.uid();

  if not exists (
    select 1
    from public.profiles
    where id = v_trainer_id
      and role = 'trainer'
  ) then
    return null;
  end if;

  delete from public.trainer_links
  where trainer_id = v_trainer_id
    and trainee_id = p_trainee_id;

  return true;
end;
$$;

revoke all on function public.unlink_trainee(uuid) from public, anon;

grant execute on function public.unlink_trainee(uuid) to authenticated;
