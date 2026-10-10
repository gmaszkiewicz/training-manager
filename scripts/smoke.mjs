// Smoke test: proves the built app, the Cloudflare adapter and the Supabase auth flow still work together.
// Zero dependencies on purpose. Run against a live server: BASE_URL=http://localhost:4321 node scripts/smoke.mjs
// Catalog proof reads SUPABASE_URL and SUPABASE_KEY. A local run exports them from `supabase status -o env`.

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_KEY ?? "";
const email = `smoke-${Date.now()}@example.com`;
const secondEmail = `smoke-second-${Date.now()}@example.com`;
const unlinkedEmail = `smoke-unlinked-${Date.now()}@example.com`;
const trainerEmail = `smoke-trainer-${Date.now()}@example.com`;
const unknownEmail = `smoke-missing-${Date.now()}@example.com`;
const earlierNote = "smoke-earlier-trainee-note";
const laterNote = "smoke-later-trainee-note";
const unlinkedNote = "smoke-unlinked-trainee-note";
const foreignWriteNote = "smoke-foreign-write-note";
const password = "Smoke-Test-Passw0rd!";
const profileEmail = `smoke-profile-${Date.now()}@example.com`;
const profilePassword = "Smoke-Profile-Current1!";
const profileNextPassword = "Smoke-Profile-Nextword1!";
const jar = new Map();
const jarA = new Map();
const jarB = new Map();
let traineeId = "";
let secondTraineeId = "";
let unlinkedTraineeId = "";
let measurementId = "";

function cookieHeaderFrom(cookieJar) {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookiesInto(cookieJar, response) {
  for (const raw of response.headers.getSetCookie()) {
    const [pair, ...attrs] = raw.split(";");
    const [name, ...rest] = pair.split("=");
    const expired = attrs.some((a) => /max-age=0/i.test(a.trim()));
    if (expired) cookieJar.delete(name.trim());
    else cookieJar.set(name.trim(), rest.join("="));
  }
}

function measurementForm(measuredOn, weightKg, note = "") {
  return {
    measured_on: measuredOn,
    weight_kg: weightKg,
    chest_cm: "50.0",
    waist_cm: "50.0",
    arms_cm: "50.0",
    thigh_cm: "50.0",
    calf_cm: "50.0",
    hips_cm: "50.0",
    navel_cm: "50.0",
    note,
  };
}

function utcDatePlusDays(days) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

const futureDate = utcDatePlusDays(2);
const futureMeasuredOn = `${futureDate}T00:00`;
const todayMorning = `${utcDatePlusDays(0)}T07:00`;
const todayEvening = `${utcDatePlusDays(0)}T19:00`;
const fixtureMonths = ["2024-01", "2024-06", "2026-03"];

function utcCurrentMonth(now = new Date()) {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}`;
}

function catalogDates(now = new Date()) {
  const months = [...fixtureMonths];
  const current = utcCurrentMonth(now);
  if (!months.includes(current)) {
    months.push(current);
  }
  months.sort((left, right) => (left < right ? 1 : left > right ? -1 : 0));
  return months;
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  return globalThis.Buffer.from(`${base64}${"=".repeat(pad)}`, "base64").toString("utf8");
}

function userIdFromSession(session) {
  if (!session || typeof session !== "object") return "";
  const user = session.user;
  if (user && typeof user.id === "string" && user.id !== "") return user.id;
  if (typeof session.access_token !== "string") return "";
  const payload = session.access_token.split(".")[1];
  if (!payload) return "";
  try {
    const claims = JSON.parse(decodeBase64Url(payload));
    return typeof claims.sub === "string" ? claims.sub : "";
  } catch {
    return "";
  }
}

function cookieText(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function sessionPayload() {
  const bases = new Set();
  for (const name of jar.keys()) {
    const match = /^(sb-.+-auth-token)(?:\.\d+)?$/.exec(name);
    if (match) bases.add(match[1]);
  }
  for (const base of bases) {
    let encoded = cookieText(jar.get(base) ?? "");
    if (!encoded) {
      const parts = [];
      for (let index = 0; ; index += 1) {
        const chunk = jar.get(`${base}.${index}`);
        if (!chunk) break;
        parts.push(cookieText(chunk));
      }
      encoded = parts.join("");
    }
    const jsonText = encoded.startsWith("base64-") ? decodeBase64Url(encoded.slice("base64-".length)) : encoded;
    try {
      const session = JSON.parse(jsonText);
      if (userIdFromSession(session)) return session;
    } catch {
      // A torn cookie is ignored; another auth cookie may still hold the session.
    }
  }
  return null;
}

function sessionUserId() {
  const session = sessionPayload();
  return session ? userIdFromSession(session) : "";
}

function sessionAccessToken() {
  const session = sessionPayload();
  if (!session || typeof session.access_token !== "string") return "";
  return session.access_token;
}

function rememberTrainee(run) {
  return async () => {
    const actual = await run();
    const id = sessionUserId();
    if (id) traineeId = id;
    return actual;
  };
}

function rememberSecondTrainee(run) {
  return async () => {
    const actual = await run();
    const id = sessionUserId();
    if (id) secondTraineeId = id;
    return actual;
  };
}

function rememberUnlinkedTrainee(run) {
  return async () => {
    const actual = await run();
    const id = sessionUserId();
    if (id) unlinkedTraineeId = id;
    return actual;
  };
}

function editIdForNote(html, note) {
  const editId = /[?&]edit=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  for (const item of html.split(/<li[\s>]/).slice(1)) {
    const row = item.split("</li>")[0];
    if (!row.includes(note)) continue;
    const match = editId.exec(row);
    return match ? match[1] : "";
  }
  return "";
}

function rememberMeasurement(run) {
  return async () => {
    const actual = await run();
    const id = editIdForNote(actual.body, earlierNote);
    if (!id) return { ...actual, measurementMissing: true };
    measurementId = id;
    return actual;
  };
}

let redirectPath = "";

function rememberRedirect(run) {
  return async () => {
    const actual = await run();
    if (actual.location.startsWith("/")) {
      redirectPath = actual.location;
      return actual;
    }
    const match = /^https?:\/\/[^/]+(\/.*)$/.exec(actual.location);
    redirectPath = match ? match[1] : "";
    return actual;
  };
}

function followRedirect() {
  return request(redirectPath);
}

async function requestWith(cookieJar, path, { method = "GET", form } = {}) {
  const response = await fetch(BASE_URL + path, {
    method,
    redirect: "manual",
    headers: {
      Cookie: cookieHeaderFrom(cookieJar),
      Origin: BASE_URL,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  storeCookiesInto(cookieJar, response);
  const body = await response.text();
  return { status: response.status, location: response.headers.get("location") ?? "", body };
}

async function request(path, options) {
  return requestWith(jar, path, options);
}

async function measurementMonthsRpc() {
  if (SUPABASE_URL === "" || SUPABASE_KEY === "") {
    return { status: 0, location: "", body: "" };
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/measurement_months`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${sessionAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_trainee_id: unlinkedTraineeId }),
  });
  const body = await response.text();
  return { status: response.status, location: "", body };
}

function januaryCatalog() {
  return {
    dates: catalogDates(),
    datesBelow: 5,
    entriesLength: 3,
    pageCount: 1,
  };
}

function juneDifference(withDates) {
  const spec = {
    entriesLength: 1,
    weightDelta: { direction: "up", difference: 8 },
  };
  if (withDates) spec.dates = catalogDates();
  return spec;
}

const steps = [
  ["home renders", () => request("/"), { status: 200 }],
  ["measurements redirects anonymous user", () => request("/measurements"), { status: 302, location: "/auth/signin" }],
  ["profile redirects anonymous user", () => request("/profile"), { status: 302, location: "/auth/signin" }],
  [
    "measurements redirect anonymous user",
    () => request("/api/measurements", { method: "POST" }),
    { status: 302, location: "/auth/signin" },
  ],
  [
    "signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email, password, role: "trainee" } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "signin rejects wrong password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password: "wrong" } }),
    { status: 302, location: "/auth/signin?error=" },
  ],
  [
    "signin accepts correct password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "measurements renders for signed-in user",
    () => request("/measurements"),
    { status: 200, body: "No measurements yet" },
  ],
  [
    "measurement rejects a future date",
    () => request("/api/measurements", { method: "POST", form: measurementForm(futureMeasuredOn, "80.0") }),
    { status: 302, location: "/measurements?error=" },
  ],
  [
    "future date leaves the journal empty",
    () => request("/measurements"),
    { status: 200, body: "No measurements yet", forbid: futureDate },
  ],
  [
    "measurement rejects out-of-range weight",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2026-01-01T07:00", "800") }),
    { status: 302, location: "/measurements?error=" },
  ],
  [
    "measurement saves the first entry",
    () => request("/api/measurements", { method: "POST", form: measurementForm(todayMorning, "80.0") }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "measurement saves the second entry with a note",
    () => request("/api/measurements", { method: "POST", form: measurementForm(todayEvening, "78.5", earlierNote) }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "measurements shows the weight delta",
    rememberTrainee(rememberMeasurement(() => request("/measurements"))),
    { status: 200, body: "↓ 1.5" },
  ],
  [
    "measurement note edit leaves the clock-order delta",
    () =>
      request(`/api/measurements/${measurementId}`, {
        method: "POST",
        form: measurementForm(todayEvening, "78.5", earlierNote),
      }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "measurements keeps the clock-order delta after a note edit",
    () => request("/measurements"),
    { status: 200, body: "↓ 1.5" },
  ],
  [
    "measurement edits the saved weight",
    () =>
      request(`/api/measurements/${measurementId}`, {
        method: "POST",
        form: measurementForm(todayEvening, "81.0", earlierNote),
      }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "measurements shows the saved weight delta",
    () => request("/measurements"),
    { status: 200, body: "↑ 1.0", forbid: "↓ 1.5" },
  ],
  ["signout clears session", () => request("/api/auth/signout", { method: "POST" }), { status: 302, location: "/" }],
  ["measurements redirects after signout", () => request("/measurements"), { status: 302, location: "/auth/signin" }],
  [
    "signup rejects a missing role",
    () => request("/api/auth/signup", { method: "POST", form: { email: trainerEmail, password } }),
    { status: 302, location: "/auth/signup?error=" },
  ],
  [
    "measurements stays signed out without a role",
    () => request("/measurements"),
    { status: 302, location: "/auth/signin" },
  ],
  [
    "signup rejects an unknown role",
    () => request("/api/auth/signup", { method: "POST", form: { email: trainerEmail, password, role: "admin" } }),
    { status: 302, location: "/auth/signup?error=" },
  ],
  [
    "measurements stays signed out after an unknown role",
    () => request("/measurements"),
    { status: 302, location: "/auth/signin" },
  ],
  [
    "trainer signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email: trainerEmail, password, role: "trainer" } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "trainer measurements confirms the role",
    () => request("/measurements"),
    { status: 200, body: "Find trainee by email", forbid: "No measurements yet" },
  ],
  [
    "trainer measurement is rejected",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2026-01-01T07:00", "80.0") }),
    { status: 302, location: "/measurements?error=" },
  ],
  [
    "trainer link opens the trainee",
    () => request("/api/trainer-links", { method: "POST", form: { email } }),
    { status: 302, location: () => `/measurements?trainee=${traineeId}`, exactLocation: true },
  ],
  [
    "trainer link repeats the same trainee",
    () => request("/api/trainer-links", { method: "POST", form: { email } }),
    { status: 302, location: () => `/measurements?trainee=${traineeId}`, exactLocation: true },
  ],
  [
    "unknown email link is rejected",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email: unknownEmail } })),
    { status: 302, location: "/measurements?error=" },
  ],
  ["unknown email shows one failure sentence", followRedirect, { status: 200, body: "No trainee with that email" }],
  [
    "trainer email link is rejected",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email: trainerEmail } })),
    { status: 302, location: "/measurements?error=" },
  ],
  ["trainer email shows one failure sentence", followRedirect, { status: 200, body: "No trainee with that email" }],
  [
    "blank email link is rejected",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email: "" } })),
    { status: 302, location: "/measurements?error=" },
  ],
  [
    "blank email shows the blank sentence",
    followRedirect,
    { status: 200, body: "Enter an email address", forbid: "No trainee with that email" },
  ],
  [
    "signout before a trainee link",
    () => request("/api/auth/signout", { method: "POST" }),
    { status: 302, location: "/" },
  ],
  [
    "trainee signs in to attempt a link",
    () => request("/api/auth/signin", { method: "POST", form: { email, password } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "trainee link is rejected",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email } })),
    { status: 302, location: "/measurements?error=" },
  ],
  ["trainee link shows one failure sentence", followRedirect, { status: 200, body: "No trainee with that email" }],
  [
    "signout before the second trainee",
    () => request("/api/auth/signout", { method: "POST" }),
    { status: 302, location: "/" },
  ],
  [
    "second trainee signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email: secondEmail, password, role: "trainee" } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "second trainee opens the journal",
    rememberSecondTrainee(() => request("/measurements")),
    { status: 200, body: "No measurements yet" },
  ],
  [
    "second trainee saves the first entry",
    () => request("/api/measurements", { method: "POST", form: measurementForm(todayMorning, "90.0") }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "second trainee saves the second entry with a note",
    () => request("/api/measurements", { method: "POST", form: measurementForm(todayEvening, "88.0", laterNote) }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "second trainee query shows the later note",
    () => request(`/measurements?trainee=${traineeId}`),
    { status: 200, body: laterNote, forbid: earlierNote },
  ],
  [
    "second trainee update is rejected",
    () =>
      request(`/api/measurements/${measurementId}`, {
        method: "POST",
        form: measurementForm("2026-01-01T19:00", "78.5", foreignWriteNote),
      }),
    { status: 302, locationIncludes: "error=" },
  ],
  [
    "second trainee delete is rejected",
    () =>
      request(`/api/measurements/${measurementId}/delete`, {
        method: "POST",
        form: measurementForm("2026-01-01T19:00", "78.5", foreignWriteNote),
      }),
    { status: 302, locationIncludes: "error=" },
  ],
  [
    "signout after the second trainee",
    () => request("/api/auth/signout", { method: "POST" }),
    { status: 302, location: "/" },
  ],
  [
    "unlinked trainee signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email: unlinkedEmail, password, role: "trainee" } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "unlinked trainee opens the journal",
    rememberUnlinkedTrainee(() => request("/measurements")),
    { status: 200, body: "No measurements yet" },
  ],
  [
    "unlinked trainee saves an entry with a note",
    () =>
      request("/api/measurements", { method: "POST", form: measurementForm("2026-03-01T08:00", "70.0", unlinkedNote) }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "unlinked trainee saves 2024-01-02",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2024-01-02T08:00", "80.0", "") }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "unlinked trainee saves 2024-01-15",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2024-01-15T08:00", "81.0", "") }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "unlinked trainee saves 2024-01-28",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2024-01-28T08:00", "82.0", "") }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "unlinked trainee saves 2024-06-01",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2024-06-01T08:00", "90.0", "") }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "unlinked trainee January catalog",
    () => request("/api/measurements?month=2024-01&size=5&page=1"),
    { status: 200, json: januaryCatalog },
  ],
  [
    "unlinked trainee June difference",
    () => request("/api/measurements?month=2024-06&size=5&page=1"),
    { status: 200, json: () => juneDifference(false) },
  ],
  [
    "unlinked trainee measurement months",
    () => measurementMonthsRpc(),
    { status: 200, json: () => ({ measuredMonths: fixtureMonths }) },
  ],
  [
    "signout after the unlinked trainee",
    () => request("/api/auth/signout", { method: "POST" }),
    { status: 302, location: "/" },
  ],
  [
    "trainer signs in for preview",
    () => request("/api/auth/signin", { method: "POST", form: { email: trainerEmail, password } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "trainer links the second trainee",
    () => request("/api/trainer-links", { method: "POST", form: { email: secondEmail } }),
    { status: 302, location: () => `/measurements?trainee=${secondTraineeId}`, exactLocation: true },
  ],
  [
    "trainer default shows the later email",
    () => request("/measurements"),
    { status: 200, body: secondEmail, forbid: ["Add measurement", earlierNote] },
  ],
  [
    "trainer default shows the later note and delta",
    () => request("/measurements"),
    { status: 200, body: laterNote, forbid: earlierNote },
  ],
  ["trainer default shows a delta marker", () => request("/measurements"), { status: 200, body: "↓" }],
  [
    "trainer earlier trainee query shows the earlier note",
    () => request(`/measurements?trainee=${traineeId}`),
    { status: 200, body: earlierNote, forbid: laterNote },
  ],
  [
    "trainer update is rejected",
    () =>
      request(`/api/measurements/${measurementId}`, {
        method: "POST",
        form: measurementForm("2026-01-01T19:00", "78.5", foreignWriteNote),
      }),
    { status: 302, locationIncludes: "error=" },
  ],
  [
    "trainer delete is rejected",
    () =>
      request(`/api/measurements/${measurementId}/delete`, {
        method: "POST",
        form: measurementForm("2026-01-01T19:00", "78.5", foreignWriteNote),
      }),
    { status: 302, locationIncludes: "error=" },
  ],
  [
    "trainer never-linked query shows a linked note",
    () => request(`/measurements?trainee=${unlinkedTraineeId}`),
    { status: 200, bodyAny: [earlierNote, laterNote], forbid: unlinkedNote },
  ],
  [
    "trainer unlinked catalog is the current month",
    () => request(`/api/measurements?month=2024-06&size=5&page=1&trainee=${unlinkedTraineeId}`),
    {
      status: 200,
      json: () => ({ dates: [utcCurrentMonth()], entriesLength: 0, pageCount: 1 }),
    },
  ],
  [
    "trainer measurement months before the link",
    () => measurementMonthsRpc(),
    { status: 200, json: () => ({ measuredMonths: [] }) },
  ],
  [
    "trainer links the unlinked trainee",
    () => request("/api/trainer-links", { method: "POST", form: { email: unlinkedEmail } }),
    { status: 302, location: () => `/measurements?trainee=${unlinkedTraineeId}`, exactLocation: true },
  ],
  [
    "trainer linked January catalog",
    () => request(`/api/measurements?month=2024-01&size=5&page=1&trainee=${unlinkedTraineeId}`),
    { status: 200, json: januaryCatalog },
  ],
  [
    "trainer linked June difference",
    () => request(`/api/measurements?month=2024-06&size=5&page=1&trainee=${unlinkedTraineeId}`),
    { status: 200, json: () => juneDifference(true) },
  ],
  [
    "trainer measurement months after the link",
    () => measurementMonthsRpc(),
    { status: 200, json: () => ({ measuredMonths: fixtureMonths }) },
  ],
  [
    "signout before checking the trainee journal",
    () => request("/api/auth/signout", { method: "POST" }),
    { status: 302, location: "/" },
  ],
  [
    "trainee signs in for the journal check",
    () => request("/api/auth/signin", { method: "POST", form: { email, password } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "trainee journal still has Add measurement",
    () => request("/measurements"),
    { status: 200, body: ["Add measurement", earlierNote], forbid: foreignWriteNote },
  ],
  [
    "signin shows forgot password",
    () => request("/auth/signin"),
    { status: 200, body: ["Forgot password?", 'href="/auth/reset-password"'] },
  ],
  [
    "unknown email reset is rejected",
    () => request("/api/auth/reset-password", { method: "POST", form: { email: unknownEmail } }),
    { status: 302, location: "/auth/reset-password?error=unknown-email", exactLocation: true },
  ],
  [
    "unusable reset token is rejected",
    () =>
      request("/api/auth/reset-password/confirm", {
        method: "POST",
        form: { token_hash: "not-a-token", type: "recovery", password, confirmPassword: password },
      }),
    { status: 302, location: "/auth/reset-password?error=reset-link", exactLocation: true },
  ],
  ["measurements stays signed in after a reminder", () => request("/measurements"), { status: 200 }],
  [
    "profile user signs up",
    () =>
      requestWith(new Map(), "/api/auth/signup", {
        method: "POST",
        form: { email: profileEmail, password: profilePassword, role: "trainee" },
      }),
    { status: 302, location: "/measurements" },
  ],
  [
    "profile jar A signs in",
    () =>
      requestWith(jarA, "/api/auth/signin", {
        method: "POST",
        form: { email: profileEmail, password: profilePassword },
      }),
    { status: 302, location: "/measurements" },
  ],
  [
    "profile jar B signs in",
    () =>
      requestWith(jarB, "/api/auth/signin", {
        method: "POST",
        form: { email: profileEmail, password: profilePassword },
      }),
    { status: 302, location: "/measurements" },
  ],
  [
    "profile rejects the wrong current password",
    () =>
      requestWith(jarA, "/api/auth/password", {
        method: "POST",
        form: { currentPassword: "wrong", password: profileNextPassword, confirmPassword: profileNextPassword },
      }),
    { status: 302, location: "/profile?error=current-password", exactLocation: true },
  ],
  ["profile other session stays signed in", () => requestWith(jarB, "/profile"), { status: 200 }],
  [
    "profile changes the password",
    () =>
      requestWith(jarA, "/api/auth/password", {
        method: "POST",
        form: {
          currentPassword: profilePassword,
          password: profileNextPassword,
          confirmPassword: profileNextPassword,
        },
      }),
    { status: 302, location: "/profile?notice=password-changed", exactLocation: true },
  ],
  ["profile stays signed in after the change", () => requestWith(jarA, "/profile"), { status: 200 }],
  ["profile other session ends", () => requestWith(jarB, "/profile"), { status: 302, location: "/auth/signin" }],
  [
    "profile signs out",
    () => requestWith(jarA, "/api/auth/signout", { method: "POST" }),
    { status: 302, location: "/" },
  ],
  [
    "profile old password is rejected",
    () =>
      requestWith(jarA, "/api/auth/signin", {
        method: "POST",
        form: { email: profileEmail, password: profilePassword },
      }),
    { status: 302, location: "/auth/signin?error=" },
  ],
  [
    "profile new password signs in",
    () =>
      requestWith(jarA, "/api/auth/signin", {
        method: "POST",
        form: { email: profileEmail, password: profileNextPassword },
      }),
    { status: 302, location: "/measurements" },
  ],
];

function sameStrings(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}

function monthSetEquals(rows, expected) {
  if (!Array.isArray(rows) || rows.length !== expected.length) return false;
  const actual = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || typeof row.measured_month !== "string") return false;
    actual.push(row.measured_month);
  }
  actual.sort();
  const wanted = [...expected].sort();
  return actual.every((month, index) => month === wanted[index]);
}

function sameWeightDelta(actual, expected) {
  if (!actual || typeof actual !== "object") return false;
  const keys = Object.keys(actual);
  return (
    keys.length === 2 &&
    keys.includes("direction") &&
    keys.includes("difference") &&
    actual.direction === expected.direction &&
    actual.difference === expected.difference
  );
}

function jsonProblems(parsed, spec) {
  const problems = [];
  const dates = parsed && typeof parsed === "object" ? parsed.dates : undefined;
  const entries = parsed && typeof parsed === "object" ? parsed.entries : undefined;
  const pageCount = parsed && typeof parsed === "object" ? parsed.pageCount : undefined;
  if (spec.dates !== undefined && !sameStrings(dates, spec.dates)) {
    problems.push(`dates ${JSON.stringify(dates)} expected ${JSON.stringify(spec.dates)}`);
  }
  if (spec.datesBelow !== undefined) {
    const length = Array.isArray(dates) ? dates.length : -1;
    if (!(length < spec.datesBelow)) {
      problems.push(`dates.length ${length} expected < ${spec.datesBelow}`);
    }
  }
  if (spec.entriesLength !== undefined) {
    const length = Array.isArray(entries) ? entries.length : -1;
    if (length !== spec.entriesLength) {
      problems.push(`entries.length ${length} expected ${spec.entriesLength}`);
    }
  }
  if (spec.pageCount !== undefined && pageCount !== spec.pageCount) {
    problems.push(`pageCount ${JSON.stringify(pageCount)} expected ${spec.pageCount}`);
  }
  if (spec.weightDelta !== undefined) {
    const only = Array.isArray(entries) && entries.length === 1 ? entries[0] : undefined;
    const deltas = only && typeof only === "object" ? only.deltas : undefined;
    const delta = deltas && typeof deltas === "object" ? deltas.weight_kg : undefined;
    if (!sameWeightDelta(delta, spec.weightDelta)) {
      problems.push(`deltas.weight_kg ${JSON.stringify(delta ?? null)} expected ${JSON.stringify(spec.weightDelta)}`);
    }
  }
  if (spec.measuredMonths !== undefined && !monthSetEquals(parsed, spec.measuredMonths)) {
    problems.push(`measured_month set ${JSON.stringify(parsed)} expected ${JSON.stringify(spec.measuredMonths)}`);
  }
  return problems;
}

function matchJson(body, spec) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, detail: " json parse" };
  }
  const problems = jsonProblems(parsed, spec);
  if (problems.length === 0) return { ok: true, detail: "" };
  return { ok: false, detail: ` ${problems.join("; ")}` };
}

let failed = 0;
for (const [name, run, expected] of steps) {
  const actual = await run();
  const location = typeof expected.location === "function" ? expected.location() : expected.location;
  const locationIncludes = expected.locationIncludes;
  const locationOk =
    (location === undefined ||
      (expected.exactLocation ? actual.location === location : actual.location.startsWith(location))) &&
    (locationIncludes === undefined || actual.location.includes(locationIncludes));
  const bodies = expected.body === undefined ? [] : Array.isArray(expected.body) ? expected.body : [expected.body];
  const bodyOk = bodies.every((text) => actual.body.includes(text));
  const bodyAny =
    expected.bodyAny === undefined ? [] : Array.isArray(expected.bodyAny) ? expected.bodyAny : [expected.bodyAny];
  const bodyAnyOk = bodyAny.length === 0 || bodyAny.some((text) => actual.body.includes(text));
  const forbids =
    expected.forbid === undefined ? [] : Array.isArray(expected.forbid) ? expected.forbid : [expected.forbid];
  const forbidOk = forbids.every((text) => !actual.body.includes(text));
  const measurementOk = actual.measurementMissing !== true;
  const jsonSpec = typeof expected.json === "function" ? expected.json() : expected.json;
  const jsonResult = jsonSpec === undefined ? { ok: true, detail: "" } : matchJson(actual.body, jsonSpec);
  const ok =
    actual.status === expected.status &&
    locationOk &&
    bodyOk &&
    bodyAnyOk &&
    forbidOk &&
    measurementOk &&
    jsonResult.ok;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  -> ${actual.status} ${actual.location}`);
  if (!ok) {
    failed++;
    const expectedBody =
      bodies.length > 0 ? ` body contains ${JSON.stringify(bodies.length === 1 ? bodies[0] : bodies)}` : "";
    const expectedBodyAny = bodyAny.length > 0 ? ` body contains any of ${JSON.stringify(bodyAny)}` : "";
    const expectedForbid =
      forbids.length > 0 ? ` body excludes ${JSON.stringify(forbids.length === 1 ? forbids[0] : forbids)}` : "";
    const expectedLocation = [
      location ? `${expected.exactLocation ? "exactly " : ""}${location}` : "",
      locationIncludes ? `location contains ${JSON.stringify(locationIncludes)}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const expectedMeasurement = actual.measurementMissing ? ` edit= id for ${JSON.stringify(earlierNote)}` : "";
    console.log(
      `      expected ${expected.status} ${expectedLocation}${expectedBody}${expectedBodyAny}${expectedForbid}${expectedMeasurement}${jsonResult.detail}`,
    );
  }
}

console.log(failed ? `\n${failed} step(s) failed` : "\nAll smoke steps passed");
process.exit(failed ? 1 : 0);
