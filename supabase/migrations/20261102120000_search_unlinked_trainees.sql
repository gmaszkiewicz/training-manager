-- Find trainee by name: every word of the query matches the first name, last name or email of an unlinked trainee,
-- ignoring case and diacritics (ł → l, ż → z). Answers names with emails in name order.
-- Additive: the previous Worker keeps calling search_unlinked_trainee_emails, which stays unchanged.
create extension if not exists unaccent with schema extensions;

-- unaccent(text) is only stable and cannot resolve its dictionary under an empty search path, so the fold calls the
-- two-argument form with a qualified dictionary.
create function public.fold_search_text(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select pg_catalog.lower(
    extensions.unaccent('extensions.unaccent'::regdictionary, pg_catalog.btrim(p_value))
  );
$$;

-- Only search_unlinked_trainees calls it, as its owner, so no API role may.
revoke all on function public.fold_search_text(text) from public, anon, authenticated;

create function public.search_unlinked_trainees(p_query text)
returns table (
  email text,
  first_name text,
  last_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_trainer_id uuid;
  v_words text[];
begin
  v_trainer_id := auth.uid();

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_trainer_id
      and p.role = 'trainer'
  ) then
    return;
  end if;

  v_words := pg_catalog.array_remove(
    pg_catalog.regexp_split_to_array(public.fold_search_text(p_query), '\s+'),
    ''
  );

  -- At least 3 characters (spaces aside), so a one- or two-letter query cannot list every trainee.
  if v_words is null or pg_catalog.char_length(pg_catalog.array_to_string(v_words, '')) < 3 then
    return;
  end if;

  return query
  select
    pg_catalog.lower(pg_catalog.btrim(u.email))::text,
    p.first_name,
    p.last_name
  from auth.users as u
  inner join public.profiles as p
    on p.id = u.id
   and p.role = 'trainee'
  where not exists (
      select 1
      from pg_catalog.unnest(v_words) as w(word)
      where pg_catalog.strpos(coalesce(public.fold_search_text(p.first_name), ''), w.word) = 0
        and pg_catalog.strpos(coalesce(public.fold_search_text(p.last_name), ''), w.word) = 0
        and pg_catalog.strpos(coalesce(public.fold_search_text(u.email), ''), w.word) = 0
    )
    and not exists (
      select 1
      from public.trainer_links as l
      where l.trainer_id = v_trainer_id
        and l.trainee_id = u.id
    )
  order by
    public.fold_search_text(p.last_name) asc nulls last,
    public.fold_search_text(p.first_name) asc nulls last,
    pg_catalog.lower(pg_catalog.btrim(u.email)) asc
  limit 10;
end;
$$;

revoke all on function public.search_unlinked_trainees(text) from public, anon;

grant execute on function public.search_unlinked_trainees(text) to authenticated;
