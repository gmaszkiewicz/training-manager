import type { APIRoute } from "astro";
import { z } from "zod";

import { authPage } from "@/lib/auth-response";
import {
  AVATAR_LARGE_ERROR,
  AVATAR_MAX_BYTES,
  AVATAR_TYPE_ERROR,
  AVATAR_UNAVAILABLE_ERROR,
  parseAvatarFile,
  sniffAvatarType,
} from "@/lib/profile-avatar";
import { removeAvatar, replaceAvatar } from "@/lib/services/profile-avatar";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const AVATAR_PAGE = "/profile/avatar";

// Room for the multipart boundaries and the other fields around a full-size image.
const MAX_BODY_BYTES = AVATAR_MAX_BYTES + 64 * 1024;

const intentSchema = z.enum(["upload", "remove"]).default("upload");

// Only "remove" removes; any other value is an upload.
function parseIntent(value: FormDataEntryValue | null): "upload" | "remove" {
  const parsed = intentSchema.safeParse(value ?? undefined);
  return parsed.success ? parsed.data : "upload";
}

async function readForm(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch {
    return null;
  }
}

// Reads an unwanted body to the end without keeping it. Answering before the upload is read lets
// workerd close the connection under the local preview proxy, which then fails the request with a 500.
async function discardBody(request: Request): Promise<void> {
  const reader = request.body?.getReader();
  if (!reader) {
    return;
  }
  try {
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        return;
      }
    }
  } catch {
    // The client went away; there is nothing left to answer.
  }
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    await discardBody(context.request);
    return authPage(context, "/auth/signin");
  }

  // Refuse oversized or unsized bodies before formData() reads them into memory.
  const length = Number(context.request.headers.get("content-length"));
  if (!length || length > MAX_BODY_BYTES) {
    await discardBody(context.request);
    return authPage(context, `${AVATAR_PAGE}?error=avatar-large`, AVATAR_LARGE_ERROR);
  }

  const form = (await readForm(context.request)) ?? new FormData();
  const intent = parseIntent(form.get("intent"));

  const supabase = createClient(context.request.headers, context.cookies);

  if (intent === "remove") {
    const removed = supabase ? await removeAvatar(supabase, user.id) : { ok: false };
    if (!removed.ok) {
      return authPage(context, `${AVATAR_PAGE}?error=avatar-unavailable`, AVATAR_UNAVAILABLE_ERROR);
    }
    return authPage(context, `${AVATAR_PAGE}?notice=avatar-removed`);
  }

  const parsed = parseAvatarFile(form.get("avatar"));
  if (!parsed.ok) {
    return authPage(context, `${AVATAR_PAGE}?error=${parsed.code}`, parsed.error);
  }

  const leading = new Uint8Array(await parsed.file.slice(0, 12).arrayBuffer());
  if (sniffAvatarType(leading) !== parsed.file.type) {
    return authPage(context, `${AVATAR_PAGE}?error=avatar-type`, AVATAR_TYPE_ERROR);
  }

  const saved = supabase ? await replaceAvatar(supabase, user.id, parsed.file, parsed.extension) : { ok: false };
  if (!saved.ok) {
    return authPage(context, `${AVATAR_PAGE}?error=avatar-unavailable`, AVATAR_UNAVAILABLE_ERROR);
  }

  return authPage(context, `${AVATAR_PAGE}?notice=avatar-saved`);
};
