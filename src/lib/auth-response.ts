import type { APIRoute } from "astro";

type Context = Parameters<APIRoute>[0];

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Keeps the no-JS redirect. A JSON client stays on the form when `error` is set. */
export function authPage(context: Context, redirectTo: string, error?: string, status = 400): Response {
  if (!wantsJson(context.request)) {
    return context.redirect(redirectTo);
  }
  if (error !== undefined) {
    return json({ error }, status);
  }
  return json({ ok: true, redirect: redirectTo }, 200);
}
