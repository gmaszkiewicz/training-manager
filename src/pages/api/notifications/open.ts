import type { APIRoute } from "astro";
import { z } from "zod";

import { notificationHref } from "@/lib/notifications";
import { openNotification } from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const idSchema = z.uuid();
const failed = "/hub/notifications?error=failed";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) {
    return context.redirect(failed);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(failed);
  }

  const opened = await openNotification(supabase, id.data);
  if (!opened.ok) {
    return context.redirect(failed);
  }

  // The target comes from the stored kind only, never from the request or the row's text.
  return context.redirect(notificationHref(opened.kind));
};
