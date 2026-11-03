import { defineMiddleware } from "astro:middleware";
import { staleAccountCookieNames } from "@/lib/preference-cookies";
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

  // Expire other accounts' `tm.*` preference cookies. Not on /api/auth/*: a sign-in made while another session is
  // still valid resolves the previous account here and would expire the incoming account's cookies.
  if (context.locals.user && !context.url.pathname.startsWith("/api/auth/")) {
    for (const name of staleAccountCookieNames(context.request.headers.get("cookie"), context.locals.user.id)) {
      try {
        // The exact header name and path, so the Set-Cookie replaces the browser's cookie.
        context.cookies.delete(name, { path: "/" });
      } catch {
        // A name Set-Cookie cannot carry (e.g. inner whitespace) cannot be expired from here; never fail the request.
      }
    }
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  return next();
});
