import type { APIRoute } from "astro";
import { z } from "zod";

import { collaborationMaxPage } from "@/lib/collaborations";
import { acceptTrainerLink } from "@/lib/services/trainer-links";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const otherSchema = z.uuid();
const pageSchema = z.coerce
  .number()
  .int()
  .positive()
  .catch(1)
  .transform((page) => Math.min(page, collaborationMaxPage));

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const page = pageSchema.parse(form.get("page") ?? undefined);
  const failed = `/hub/collaborations?page=${page}&error=failed`;

  const other = otherSchema.safeParse(form.get("other"));
  if (!other.success) {
    return context.redirect(failed);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(failed);
  }

  const accepted = await acceptTrainerLink(supabase, other.data);
  if (!accepted.ok || !accepted.accepted) {
    return context.redirect(failed);
  }

  return context.redirect(`/hub/collaborations?page=${page}&notice=accepted`);
};
