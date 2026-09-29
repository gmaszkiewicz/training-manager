// Smoke test: proves the built app, the Cloudflare adapter and the Supabase auth flow still work together.
// Zero dependencies on purpose. Run against a live server: BASE_URL=http://localhost:4321 node scripts/smoke.mjs

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const email = `smoke-${Date.now()}@example.com`;
const trainerEmail = `smoke-trainer-${Date.now()}@example.com`;
const unknownEmail = `smoke-missing-${Date.now()}@example.com`;
const password = "Smoke-Test-Passw0rd!";
const jar = new Map();
let traineeId = "";

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(response) {
  for (const raw of response.headers.getSetCookie()) {
    const [pair, ...attrs] = raw.split(";");
    const [name, ...rest] = pair.split("=");
    const expired = attrs.some((a) => /max-age=0/i.test(a.trim()));
    if (expired) jar.delete(name.trim());
    else jar.set(name.trim(), rest.join("="));
  }
}

function measurementForm(measuredOn, weightKg) {
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
  };
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

function sessionUserId() {
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
      const id = userIdFromSession(JSON.parse(jsonText));
      if (id) return id;
    } catch {
      // A torn cookie is ignored; another auth cookie may still hold the session.
    }
  }
  return "";
}

function rememberTrainee(run) {
  return async () => {
    const actual = await run();
    const id = sessionUserId();
    if (id) traineeId = id;
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

async function request(path, { method = "GET", form } = {}) {
  const response = await fetch(BASE_URL + path, {
    method,
    redirect: "manual",
    headers: {
      Cookie: cookieHeader(),
      Origin: BASE_URL,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  storeCookies(response);
  const body = await response.text();
  return { status: response.status, location: response.headers.get("location") ?? "", body };
}

const steps = [
  ["home renders", () => request("/"), { status: 200 }],
  ["dashboard redirects anonymous user", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
  [
    "measurements redirect anonymous user",
    () => request("/api/measurements", { method: "POST" }),
    { status: 302, location: "/auth/signin" },
  ],
  [
    "signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email, password, role: "trainee" } }),
    { status: 302, location: "/dashboard" },
  ],
  [
    "signin rejects wrong password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password: "wrong" } }),
    { status: 302, location: "/auth/signin?error=" },
  ],
  [
    "signin accepts correct password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password } }),
    { status: 302, location: "/dashboard" },
  ],
  ["dashboard renders for signed-in user", () => request("/dashboard"), { status: 200, body: "No measurements yet" }],
  [
    "measurement rejects out-of-range weight",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2026-01-01", "800") }),
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "measurement saves the first entry",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2026-01-01", "80.0") }),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "measurement saves the second entry",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2026-01-02", "78.5") }),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  ["dashboard shows the weight delta", rememberTrainee(() => request("/dashboard")), { status: 200, body: "↓ 1.5" }],
  ["signout clears session", () => request("/api/auth/signout", { method: "POST" }), { status: 302, location: "/" }],
  ["dashboard redirects after signout", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
  [
    "signup rejects a missing role",
    () => request("/api/auth/signup", { method: "POST", form: { email: trainerEmail, password } }),
    { status: 302, location: "/auth/signup?error=" },
  ],
  ["dashboard stays signed out without a role", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
  [
    "signup rejects an unknown role",
    () => request("/api/auth/signup", { method: "POST", form: { email: trainerEmail, password, role: "admin" } }),
    { status: 302, location: "/auth/signup?error=" },
  ],
  [
    "dashboard stays signed out after an unknown role",
    () => request("/dashboard"),
    { status: 302, location: "/auth/signin" },
  ],
  [
    "trainer signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email: trainerEmail, password, role: "trainer" } }),
    { status: 302, location: "/dashboard" },
  ],
  [
    "trainer dashboard confirms the role",
    () => request("/dashboard"),
    { status: 200, body: "Trainer", forbid: "No measurements yet" },
  ],
  [
    "trainer measurement is rejected",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2026-01-01", "80.0") }),
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "trainer link opens the trainee",
    () => request("/api/trainer-links", { method: "POST", form: { email } }),
    { status: 302, location: () => `/dashboard?trainee=${traineeId}`, exactLocation: true },
  ],
  [
    "trainer link repeats the same trainee",
    () => request("/api/trainer-links", { method: "POST", form: { email } }),
    { status: 302, location: () => `/dashboard?trainee=${traineeId}`, exactLocation: true },
  ],
  [
    "unknown email link is rejected",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email: unknownEmail } })),
    { status: 302, location: "/dashboard?error=" },
  ],
  ["unknown email shows one failure sentence", followRedirect, { status: 200, body: "No trainee with that email" }],
  [
    "trainer email link is rejected",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email: trainerEmail } })),
    { status: 302, location: "/dashboard?error=" },
  ],
  ["trainer email shows one failure sentence", followRedirect, { status: 200, body: "No trainee with that email" }],
  [
    "blank email link is rejected",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email: "" } })),
    { status: 302, location: "/dashboard?error=" },
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
    { status: 302, location: "/dashboard" },
  ],
  [
    "trainee link is rejected",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email } })),
    { status: 302, location: "/dashboard?error=" },
  ],
  ["trainee link shows one failure sentence", followRedirect, { status: 200, body: "No trainee with that email" }],
];

let failed = 0;
for (const [name, run, expected] of steps) {
  const actual = await run();
  const location = typeof expected.location === "function" ? expected.location() : expected.location;
  const locationOk =
    location === undefined ||
    (expected.exactLocation ? actual.location === location : actual.location.startsWith(location));
  const bodyOk = expected.body === undefined || actual.body.includes(expected.body);
  const forbidOk = expected.forbid === undefined || !actual.body.includes(expected.forbid);
  const ok = actual.status === expected.status && locationOk && bodyOk && forbidOk;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  -> ${actual.status} ${actual.location}`);
  if (!ok) {
    failed++;
    const expectedBody = expected.body ? ` body contains ${JSON.stringify(expected.body)}` : "";
    const expectedForbid = expected.forbid ? ` body excludes ${JSON.stringify(expected.forbid)}` : "";
    const expectedLocation = location ? `${expected.exactLocation ? "exactly " : ""}${location}` : "";
    console.log(`      expected ${expected.status} ${expectedLocation}${expectedBody}${expectedForbid}`);
  }
}

console.log(failed ? `\n${failed} step(s) failed` : "\nAll smoke steps passed");
process.exit(failed ? 1 : 0);
