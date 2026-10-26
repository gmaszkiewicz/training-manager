import type { APIRoute } from "astro";

import { authPage } from "@/lib/auth-response";
import { parseProfileNames, PROFILE_UNAVAILABLE_ERROR } from "@/lib/profile-form";
import { updateProfileNames } from "@/lib/services/profile-details";
import { createClient } from "@/lib/supabase";

export const prerender = false;

function formField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return authPage(context, "/auth/signin");
  }

  const form = await context.request.formData();
  const parsed = parseProfileNames({
    firstName: formField(form, "firstName"),
    lastName: formField(form, "lastName"),
  });
  if (!parsed.ok) {
    return authPage(context, `/profile?error=${parsed.code}`, parsed.error);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return authPage(context, "/profile?error=profile-unavailable", PROFILE_UNAVAILABLE_ERROR);
  }

  const saved = await updateProfileNames(supabase, user.id, parsed.names);
  if (!saved.ok) {
    return authPage(context, "/profile?error=profile-unavailable", PROFILE_UNAVAILABLE_ERROR);
  }

  return authPage(context, "/profile?notice=profile-saved");
};
