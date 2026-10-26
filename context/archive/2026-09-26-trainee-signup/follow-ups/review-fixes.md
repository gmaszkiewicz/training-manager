# Review follow-ups: trainee-signup

Source: `context/changes/trainee-signup/reviews/impl-review.md`

## F5 — Adopt generated Supabase types in S-02

- **Where**: `src/lib/services/ensure-trainee-profile.ts:6-39`, `src/lib/supabase.ts`
- **What**: When S-02 adds measurement tables, generate `src/db/database.types.ts` with `npx supabase gen types typescript --local`, type `createClient` with the generated `Database`, and delete the hand-written `ProfilesDatabase` shim and cast.
- **Check first**: whether `@supabase/ssr`'s `createServerClient<Database>` generic fits the existing `createClient` signature without widening callers.
