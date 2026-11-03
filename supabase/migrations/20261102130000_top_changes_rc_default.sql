-- Top progression 0.9 (RC) becomes the default: every profile that stored Top progression as Off moves to 0.9.
-- Stored "0.1" stays, and a null or missing choice already resolves to the new default.
-- Data only and idempotent; "0.9" is as long as "off", so the 4096-byte check still holds. The previous Worker does not
-- know "0.9" and resolves it to its own default, Off, until the new Worker is live.
update public.profiles
set component_settings = jsonb_set(component_settings, '{components,top-changes}', '"0.9"'::jsonb)
where component_settings -> 'components' ->> 'top-changes' = 'off';
