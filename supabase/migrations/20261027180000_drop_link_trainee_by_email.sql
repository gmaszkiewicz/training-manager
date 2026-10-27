-- S-37 replaced the instant link with request_trainee_link; no Worker calls this function any more.
drop function if exists public.link_trainee_by_email(text);
