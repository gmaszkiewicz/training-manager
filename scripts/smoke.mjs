// Smoke test: proves the built app, the Cloudflare adapter and the Supabase auth flow still work together.
// Zero dependencies on purpose. Run against a live server: BASE_URL=http://localhost:4321 node scripts/smoke.mjs

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const email = `smoke-${Date.now()}@example.com`;
const password = "Smoke-Test-Passw0rd!";
const jar = new Map();

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
    () => request("/api/auth/signup", { method: "POST", form: { email, password } }),
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
  ["dashboard shows the weight delta", () => request("/dashboard"), { status: 200, body: "↓ 1.5" }],
  ["signout clears session", () => request("/api/auth/signout", { method: "POST" }), { status: 302, location: "/" }],
  ["dashboard redirects after signout", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
];

let failed = 0;
for (const [name, run, expected] of steps) {
  const actual = await run();
  const locationOk =
    expected.location === undefined ||
    (expected.exactLocation ? actual.location === expected.location : actual.location.startsWith(expected.location));
  const ok =
    actual.status === expected.status &&
    locationOk &&
    (expected.body === undefined || actual.body.includes(expected.body));
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  -> ${actual.status} ${actual.location}`);
  if (!ok) {
    failed++;
    const expectedBody = expected.body ? ` body contains ${JSON.stringify(expected.body)}` : "";
    const expectedLocation = expected.location ? `${expected.exactLocation ? "exactly " : ""}${expected.location}` : "";
    console.log(`      expected ${expected.status} ${expectedLocation}${expectedBody}`);
  }
}

console.log(failed ? `\n${failed} step(s) failed` : "\nAll smoke steps passed");
process.exit(failed ? 1 : 0);
