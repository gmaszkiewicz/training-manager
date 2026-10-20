export async function submitAuthForm(
  form: HTMLFormElement,
  fallback: string,
): Promise<{ error: string } | { redirect: string }> {
  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: unknown;
      error?: unknown;
      redirect?: unknown;
    } | null;
    if (typeof payload?.error === "string" && payload.error !== "") {
      return { error: payload.error };
    }
    if (payload?.ok === true && typeof payload.redirect === "string") {
      return { redirect: payload.redirect };
    }
    return { error: fallback };
  } catch {
    return { error: fallback };
  }
}
