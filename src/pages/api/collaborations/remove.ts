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
// `unlink` and `remove` are kept for pages rendered by the previous Worker during a deploy.
const intentSchema = z.enum(["cancel", "decline", "revoke", "unlink", "remove"]);

// The database decides which link the caller may delete; the intent only picks the notice wording.
const NOTICES = {
  cancel: "cancelled",
  decline: "declined",
  revoke: "revoked",
  unlink: "revoked",
  remove: "revoked",
} as const satisfies Record<z.infer<typeof intentSchema>, string>;

// Only measurements may be revoked: the delete below removes the whole link, which is the only access
// today. Enabling another dashboard needs per-dashboard storage before it is accepted here. A missing
// dashboard means measurements.
const dashboardSchema = z.literal("measurements").optional();

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
  const dashboard = dashboardSchema.safeParse(form.get("dashboard") ?? undefined);
  if (!other.success || !intent.success || !dashboard.success) {
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
