-- The prefix-only check accepted paths like '<own-id>/../<other-id>/x.png'.
-- Only the exact shape the API writes, '<own-id>/<uuid>.<png|jpg|webp>', is allowed now.
alter table public.profiles
drop constraint profiles_avatar_path_own_folder;

alter table public.profiles
add constraint profiles_avatar_path_own_file check (
  avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$')
) not valid;

alter table public.profiles
validate constraint profiles_avatar_path_own_file;
