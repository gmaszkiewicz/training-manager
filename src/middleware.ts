import { defineMiddleware } from "astro:middleware";
import { sessionUserFromClaims } from "@/lib/session-user";
import { createClient } from "@/lib/supabase";

const PROTECTED_ROUTES = ["/measurements", "/profile", "/hub", "/settings"];

// Account-security pages ask the auth server, so a session signed out elsewhere
// (e.g. after a password change) ends at once instead of when its token expires.
const SERVER_VERIFIED_ROUTES = ["/settings"];

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase && SERVER_VERIFIED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    const { data, error } = await supabase.auth.getUser();
    context.locals.user = error
      ? null
      : sessionUserFromClaims({ sub: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata });
  } else if (supabase) {
    const { data, error } = await supabase.auth.getClaims();
    context.locals.user = error ? null : sessionUserFromClaims(data?.claims);
  } else {
    context.locals.user = null;
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  return next();
});
