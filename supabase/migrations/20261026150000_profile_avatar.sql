alter table public.profiles
add column avatar_path text null;

alter table public.profiles
add constraint profiles_avatar_path_own_folder check (
  avatar_path like id::text || '/%'
  and char_length(avatar_path) <= 200
);

-- The existing profiles_update_own policy already limits updates to the user's own row.
grant update (avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, '{image/png,image/jpeg,image/webp}')
on conflict (id) do nothing;

-- Storage remove() needs select as well as delete, so the owner may also read their own folder.
create policy avatars_select_own
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_insert_own
on storage.objects
for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update_own
on storage.objects
for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own
on storage.objects
for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
