import type { APIRoute } from "astro";

import { authPage } from "@/lib/auth-response";
import { COMPONENTS_UNAVAILABLE_ERROR, parseComponentSettingsForm } from "@/lib/component-settings-form";
import { mergeComponentSettings } from "@/lib/components";
import { readComponentSettings, updateComponentSettings } from "@/lib/services/profile-details";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const PAGE = "/settings/components";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return authPage(context, "/auth/signin");
  }

  const form = await context.request.formData();
  const parsed = parseComponentSettingsForm(form.entries());
  if (!parsed.ok) {
    return authPage(context, `${PAGE}?error=${parsed.code}`, parsed.error);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return authPage(context, `${PAGE}?error=components-unavailable`, COMPONENTS_UNAVAILABLE_ERROR);
  }

  // The form sends only the signed-in role's components, so the stored choices of the rest are merged in, never reset.
  const stored = await readComponentSettings(supabase, user.id);
  if (!stored) {
    return authPage(context, `${PAGE}?error=components-unavailable`, COMPONENTS_UNAVAILABLE_ERROR);
  }

  const saved = await updateComponentSettings(supabase, user.id, mergeComponentSettings(stored, parsed.update));
  if (!saved.ok) {
    return authPage(context, `${PAGE}?error=components-unavailable`, COMPONENTS_UNAVAILABLE_ERROR);
  }

  return authPage(context, `${PAGE}?notice=components-saved`);
};
