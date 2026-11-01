-- A user's module and component choices; null means every registry default.
-- The existing profiles_select_own and profiles_update_own policies cover the column.
alter table public.profiles
add column component_settings jsonb null;

-- An object, and small: every top bar and /measurements request reads it. The full registry stores well under 1 KB.
alter table public.profiles
add constraint profiles_component_settings_object check (
  component_settings is null
  or (jsonb_typeof(component_settings) = 'object' and pg_column_size(component_settings) <= 4096)
);

grant update (component_settings) on public.profiles to authenticated;
