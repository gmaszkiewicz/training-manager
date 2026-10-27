import type { APIRoute } from "astro";
import { z } from "zod";

import { collaborationMaxPage } from "@/lib/collaborations";
import { removeTrainerLink } from "@/lib/services/trainer-links";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const otherSchema = z.uuid();
const pageSchema = z.coerce
  .number()
  .int()
  .positive()
  .catch(1)
  .transform((page) => Math.min(page, collaborationMaxPage));
const intentSchema = z.enum(["cancel", "unlink", "decline", "remove"]);

// The database decides which link the caller may delete; the intent only picks the notice wording.
const NOTICES = {
  cancel: "cancelled",
  unlink: "unlinked",
  decline: "declined",
  remove: "removed",
} as const satisfies Record<z.infer<typeof intentSchema>, string>;

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const page = pageSchema.parse(form.get("page") ?? undefined);
  const failed = `/hub/collaborations?page=${page}&error=failed`;

  const other = otherSchema.safeParse(form.get("other"));
  const intent = intentSchema.safeParse(form.get("intent"));
  if (!other.success || !intent.success) {
    return context.redirect(failed);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(failed);
  }

  const removed = await removeTrainerLink(supabase, other.data);
  if (!removed.ok || !removed.removed) {
    return context.redirect(failed);
  }

  return context.redirect(`/hub/collaborations?page=${page}&notice=${NOTICES[intent.data]}`);
};
