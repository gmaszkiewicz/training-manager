import type { APIRoute } from "astro";
import { z } from "zod";

import { notificationsPath, parseNotificationPage, parseNotificationPageSize } from "@/lib/notifications";
import { deleteNotifications } from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const idsSchema = z.array(z.uuid()).min(1).max(15);

function text(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const page = parseNotificationPage(text(form.get("page")));
  const size = parseNotificationPageSize(text(form.get("size")));
  const failed = notificationsPath({ page, size, error: "failed" });

  const ids = idsSchema.safeParse(form.getAll("ids"));
  if (!ids.success) {
    return context.redirect(failed);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(failed);
  }

  // RLS limits the query to the caller's own rows; a foreign id is simply left untouched.
  const done = await deleteNotifications(supabase, ids.data);
  if (!done.ok) {
    return context.redirect(failed);
  }

  return context.redirect(notificationsPath({ page, size, notice: "deleted" }));
};
