// Smoke test: proves the built app, the Cloudflare adapter and the Supabase auth flow still work together.
// Zero dependencies on purpose. Run against a live server: BASE_URL=http://localhost:4321 node scripts/smoke.mjs
// Catalog proof reads SUPABASE_URL and SUPABASE_KEY. When those are unset, it uses API_URL and ANON_KEY from `supabase status -o env`.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

function supabaseExecutable() {
  if (process.platform === "win32") {
    const exe = join(root, "node_modules", "@supabase", "cli-windows-x64", "bin", "supabase.exe");
    if (existsSync(exe)) return exe;
  }
  return "supabase";
}

function unquoteEnvValue(raw) {
  if (raw.length < 2 || !raw.startsWith('"') || !raw.endsWith('"')) return raw;
  return raw.slice(1, -1);
}

function localCatalogEnv() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_KEY ?? "";
  if (url !== "" && key !== "") return { url, key };
  const status = spawnSync(supabaseExecutable(), ["status", "-o", "env"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (status.status !== 0) return { url, key };
  const env = {};
  for (const line of `${status.stdout ?? ""}\n${status.stderr ?? ""}`.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    env[line.slice(0, separator)] = unquoteEnvValue(line.slice(separator + 1));
  }
  return { url: env.API_URL ?? url, key: env.ANON_KEY ?? key };
}

const catalogEnv = localCatalogEnv();
const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const SUPABASE_URL = catalogEnv.url;
const SUPABASE_KEY = catalogEnv.key;
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
const profileFirstName = "Smoke";
const profileLastName = "Trainee";
const jar = new Map();
const jarA = new Map();
const jarB = new Map();
const secondJar = new Map();
const unlinkedJar = new Map();
let traineeId = "";
let trainerId = "";
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

function utcMinute(date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}T${hour}:${minute}`;
}

const futureDate = utcDatePlusDays(2);
const futureMeasuredOn = `${futureDate}T00:00`;
const laterInstant = new Date();
laterInstant.setUTCSeconds(0, 0);
const earlierInstant = new Date(laterInstant.getTime() - 60 * 1000);
const earlierMeasuredOn = utcMinute(earlierInstant);
const laterMeasuredOn = utcMinute(laterInstant);
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

function sessionPayload(cookieJar = jar) {
  const bases = new Set();
  for (const name of cookieJar.keys()) {
    const match = /^(sb-.+-auth-token)(?:\.\d+)?$/.exec(name);
    if (match) bases.add(match[1]);
  }
  for (const base of bases) {
    let encoded = cookieText(cookieJar.get(base) ?? "");
    if (!encoded) {
      const parts = [];
      for (let index = 0; ; index += 1) {
        const chunk = cookieJar.get(`${base}.${index}`);
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

function sessionAccessToken(cookieJar = jar) {
  const session = sessionPayload(cookieJar);
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

function rememberTrainer(run) {
  return async () => {
    const actual = await run();
    const id = sessionUserId();
    if (id) trainerId = id;
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
    if (match) return match[1];
  }
  // The row is a table. The note and id travel in the island props; the edit link stays inside the closed menu.
  const decoded = html
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
  const marker = `"note":[0,${JSON.stringify(note)}]`;
  const at = decoded.indexOf(marker);
  if (at === -1) return "";
  const ids = decoded
    .slice(0, at)
    .match(/"id":\[0,"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"\]/gi);
  if (!ids) return "";
  const last = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(ids[ids.length - 1]);
  return last ? last[1] : "";
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

function multipartBody(fields) {
  const body = new globalThis.FormData();
  for (const [name, value] of Object.entries(fields)) {
    body.append(name, value);
  }
  return body;
}

// `multipart` sends a FormData body; fetch sets its own multipart Content-Type with the boundary.
async function requestWith(cookieJar, path, { method = "GET", form, multipart } = {}) {
  const response = await fetch(BASE_URL + path, {
    method,
    redirect: "manual",
    headers: {
      Cookie: cookieHeaderFrom(cookieJar),
      Origin: BASE_URL,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: multipart ? multipartBody(multipart) : form ? new URLSearchParams(form).toString() : undefined,
  });
  storeCookiesInto(cookieJar, response);
  const body = await response.text();
  return { status: response.status, location: response.headers.get("location") ?? "", body };
}

async function request(path, options) {
  return requestWith(jar, path, options);
}

// Calls a Supabase RPC over REST with the session held in the given cookie jar.
async function rpcWith(cookieJar, name, args) {
  if (SUPABASE_URL === "" || SUPABASE_KEY === "") {
    return { status: 0, location: "", body: "" };
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${sessionAccessToken(cookieJar)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const body = await response.text();
  return { status: response.status, location: "", body };
}

async function measurementMonthsRpc(subjectId = unlinkedTraineeId) {
  return rpcWith(jar, "measurement_months", { p_trainee_id: subjectId });
}

// Reads the signed-in trainer's own link row for one trainee, so its status can be checked.
async function trainerLinkRest(subjectId) {
  if (SUPABASE_URL === "" || SUPABASE_KEY === "") {
    return { status: 0, location: "", body: "" };
  }
  const query = `trainee_id=eq.${encodeURIComponent(subjectId)}&select=status`;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/trainer_links?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${sessionAccessToken()}`,
    },
  });
  const body = await response.text();
  return { status: response.status, location: "", body };
}

// The newest notification id seen per cookie jar, so the RLS steps can aim at another user's row.
const newestNotificationIds = new Map();

function restUnavailable() {
  return SUPABASE_URL === "" || SUPABASE_KEY === "";
}

async function notificationsRest(cookieJar, query, { method = "GET", body, prefer } = {}) {
  if (restUnavailable()) {
    return { status: 0, location: "", body: "" };
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/notifications${query ? `?${query}` : ""}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${sessionAccessToken(cookieJar)}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, location: "", body: text };
}

// Reads the newest notification of the user signed in to the given jar and remembers its id.
async function newestNotificationRest(cookieJar) {
  const actual = await notificationsRest(
    cookieJar,
    "select=id,kind,actor_role,actor_email,read_at&order=created_at.desc,id.desc&limit=1",
  );
  try {
    const rows = JSON.parse(actual.body);
    if (Array.isArray(rows) && rows.length === 1 && typeof rows[0].id === "string") {
      newestNotificationIds.set(cookieJar, rows[0].id);
    }
  } catch {
    // The json check reports the unreadable body.
  }
  return actual;
}

function notificationIdQuery(cookieJar) {
  return `id=eq.${encodeURIComponent(newestNotificationIds.get(cookieJar) ?? "")}`;
}

function unreadNotification(kind, actorRole, actorEmail) {
  return { notification: { kind, actor_role: actorRole, actor_email: actorEmail, read_at: null } };
}

async function searchUnlinkedTraineesRpc() {
  if (SUPABASE_URL === "" || SUPABASE_KEY === "") {
    return { status: 0, location: "", body: "" };
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_unlinked_trainee_emails`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${sessionAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_query: "a" }),
  });
  const body = await response.text();
  return { status: response.status, location: "", body };
}

// Reads the trainee's own profile row through Supabase REST, so the role can be checked next to the names /profile renders.
async function traineeProfileRest() {
  if (SUPABASE_URL === "" || SUPABASE_KEY === "") {
    return { status: 0, location: "", body: "" };
  }
  const query = `id=eq.${encodeURIComponent(traineeId)}&select=role,first_name,last_name`;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${sessionAccessToken()}`,
    },
  });
  const body = await response.text();
  return { status: response.status, location: "", body };
}

// A 1x1 transparent PNG, inline so the smoke stays dependency- and fixture-free.
const avatarPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
let avatarPath = "";

function avatarPngFile() {
  return new globalThis.File([globalThis.Buffer.from(avatarPngBase64, "base64")], "avatar.png", { type: "image/png" });
}

function fakePngFile() {
  return new globalThis.File(["this is not an image"], "avatar.png", { type: "image/png" });
}

// A 3 MB body that starts like a PNG, so only its size is wrong.
function oversizedPngFile() {
  const bytes = globalThis.Buffer.alloc(3 * 1024 * 1024);
  globalThis.Buffer.from(avatarPngBase64, "base64").copy(bytes);
  return new globalThis.File([bytes], "avatar.png", { type: "image/png" });
}

// Reads the trainee's avatar_path through Supabase REST and remembers it for the public URL checks.
async function traineeAvatarRest() {
  if (SUPABASE_URL === "" || SUPABASE_KEY === "") {
    return { status: 0, location: "", body: "" };
  }
  const query = `id=eq.${encodeURIComponent(traineeId)}&select=avatar_path`;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${sessionAccessToken()}`,
    },
  });
  const body = await response.text();
  try {
    const rows = JSON.parse(body);
    const path = Array.isArray(rows) && rows.length === 1 ? rows[0].avatar_path : null;
    if (typeof path === "string") avatarPath = path;
  } catch {
    // The json check reports the unreadable body.
  }
  return { status: response.status, location: "", body };
}

async function avatarPublicObject() {
  if (SUPABASE_URL === "" || avatarPath === "") {
    return { status: 0, location: "", body: "" };
  }
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/public/avatars/${avatarPath}`);
  await response.arrayBuffer();
  return { status: response.status, location: "", body: "", contentType: response.headers.get("content-type") ?? "" };
}

// Tries to set the trainee's avatar_path straight through Supabase REST.
async function foreignAvatarPathRest(path) {
  if (SUPABASE_URL === "" || SUPABASE_KEY === "") {
    return { status: 0, location: "", body: "" };
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(traineeId)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${sessionAccessToken()}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ avatar_path: path }),
  });
  const body = await response.text();
  return { status: response.status, location: "", body };
}

function requestSentPath(traineeEmail) {
  return `/measurements?requested=${encodeURIComponent(traineeEmail)}`;
}

function requestErrorPath(message) {
  return `/measurements?error=${encodeURIComponent(message)}`;
}

function hubPath(query) {
  return `/hub/collaborations?page=1&${query}`;
}

// Hub actions post the other side's id with the session in the given cookie jar.
function acceptWith(cookieJar, otherId) {
  return requestWith(cookieJar, "/api/collaborations/accept", {
    method: "POST",
    form: { other: otherId, page: "1" },
  });
}

function removeWith(cookieJar, otherId, intent) {
  return requestWith(cookieJar, "/api/collaborations/remove", {
    method: "POST",
    form: { other: otherId, page: "1", intent },
  });
}

function smokeTraineeSearchPath() {
  return `/api/trainer-links?q=${encodeURIComponent(` ${email.toUpperCase()} `)}`;
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
  ["settings redirects anonymous user", () => request("/settings"), { status: 302, location: "/auth/signin" }],
  [
    "hub collaborations redirects anonymous user",
    () => request("/hub/collaborations"),
    { status: 302, location: "/auth/signin" },
  ],
  [
    "measurements redirect anonymous user",
    () => request("/api/measurements", { method: "POST" }),
    { status: 302, location: "/auth/signin" },
  ],
  [
    "profile name save redirects anonymous user",
    () => request("/api/profile", { method: "POST", form: { firstName: "Anon", lastName: "User" } }),
    { status: 302, location: "/auth/signin", exactLocation: true },
  ],
  [
    "avatar upload redirects anonymous user",
    () => request("/api/profile/avatar", { method: "POST", multipart: { intent: "upload", avatar: avatarPngFile() } }),
    { status: 302, location: "/auth/signin", exactLocation: true },
  ],
  ["signed-out trainer search is rejected", () => request("/api/trainer-links?q=a"), { status: 401 }],
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
    () => request("/api/measurements", { method: "POST", form: measurementForm(earlierMeasuredOn, "80.0") }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "measurement saves the second entry with a note",
    () => request("/api/measurements", { method: "POST", form: measurementForm(laterMeasuredOn, "78.5", earlierNote) }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "measurements shows the weight delta",
    rememberTrainee(rememberMeasurement(() => request("/measurements"))),
    { status: 200, body: ["Weight down 1.5 kg", "↓"] },
  ],
  [
    "measurement note edit leaves the clock-order delta",
    () =>
      request(`/api/measurements/${measurementId}`, {
        method: "POST",
        form: measurementForm(laterMeasuredOn, "78.5", earlierNote),
      }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "measurements keeps the clock-order delta after a note edit",
    () => request("/measurements"),
    { status: 200, body: ["Weight down 1.5 kg", "↓"] },
  ],
  [
    "measurement edits the saved weight",
    () =>
      request(`/api/measurements/${measurementId}`, {
        method: "POST",
        form: measurementForm(laterMeasuredOn, "81.0", earlierNote),
      }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "measurements shows the saved weight delta",
    () => request("/measurements"),
    { status: 200, body: ["Weight up 1.0 kg", "↑"], forbid: ["Weight down 1.5 kg", "↓"] },
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
    rememberTrainer(() => request("/measurements")),
    { status: 200, body: "Find trainee by email", forbid: "No measurements yet" },
  ],
  [
    "trainer measurement is rejected",
    () => request("/api/measurements", { method: "POST", form: measurementForm("2026-01-01T07:00", "80.0") }),
    { status: 302, location: "/measurements?error=" },
  ],
  ["trainer search finds the unlinked trainee", () => request(smokeTraineeSearchPath()), { status: 200, body: email }],
  [
    "trainer request is sent",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email } })),
    { status: 302, location: () => requestSentPath(email), exactLocation: true },
  ],
  [
    "trainer request shows the sent notice",
    followRedirect,
    { status: 200, body: `Your request has been sent to ${email}` },
  ],
  [
    "trainer re-request is already pending",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email } })),
    { status: 302, location: () => requestErrorPath(`A request to ${email} is already pending`), exactLocation: true },
  ],
  [
    "trainer re-request shows the pending sentence",
    followRedirect,
    { status: 200, body: `A request to ${email} is already pending` },
  ],
  ["trainer search omits the pending trainee", () => request(smokeTraineeSearchPath()), { status: 200, forbid: email }],
  [
    "trainer pending trainee query shows no notes",
    () => request(`/measurements?trainee=${traineeId}`),
    { status: 200, forbid: [earlierNote, email] },
  ],
  [
    "trainer pending catalog is empty",
    () => request(`/api/measurements?month=${utcCurrentMonth()}&size=5&page=1&trainee=${traineeId}`),
    { status: 200, json: () => ({ dates: [utcCurrentMonth()], entriesLength: 0, pageCount: 1 }) },
  ],
  [
    "trainer pending measurement months",
    () => measurementMonthsRpc(traineeId),
    { status: 200, json: () => ({ measuredMonths: [] }) },
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
    "trainee receives the link request notification",
    () => newestNotificationRest(jar),
    { status: 200, json: () => unreadNotification("link_requested", "trainer", trainerEmail) },
  ],
  ["trainee search is rejected", () => request("/api/trainer-links?q=a"), { status: 403 }],
  [
    "trainee search rpc returns no rows",
    () => searchUnlinkedTraineesRpc(),
    { status: 200, json: () => ({ arrayLength: 0 }) },
  ],
  [
    "trainee link is rejected",
    rememberRedirect(() => request("/api/trainer-links", { method: "POST", form: { email } })),
    { status: 302, location: "/measurements?error=" },
  ],
  ["trainee link shows one failure sentence", followRedirect, { status: 200, body: "No trainee with that email" }],
  [
    "trainee request rpc is not found",
    () => rpcWith(jar, "request_trainee_link", { p_email: email }),
    { status: 200, json: () => ({ value: "not_found" }) },
  ],
  [
    "trainee hub redirects to collaborations",
    () => request("/hub"),
    { status: 302, location: "/hub/collaborations", exactLocation: true },
  ],
  [
    "trainee hub shows the pending trainer request",
    () => request("/hub/collaborations"),
    { status: 200, body: [trainerEmail, "Pending"] },
  ],
  [
    "trainee accepts the trainer request",
    () => acceptWith(jar, trainerId),
    { status: 302, location: hubPath("notice=accepted"), exactLocation: true },
  ],
  [
    "trainee accept repeats with no pending request",
    () => acceptWith(jar, trainerId),
    { status: 302, location: hubPath("error=failed"), exactLocation: true },
  ],
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
    () => request("/api/measurements", { method: "POST", form: measurementForm(earlierMeasuredOn, "90.0") }),
    { status: 302, location: "/measurements", exactLocation: true },
  ],
  [
    "second trainee saves the second entry with a note",
    () => request("/api/measurements", { method: "POST", form: measurementForm(laterMeasuredOn, "88.0", laterNote) }),
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
    "trainer receives the accept notification",
    () => newestNotificationRest(jar),
    { status: 200, json: () => unreadNotification("link_accepted", "trainee", email) },
  ],
  [
    "trainer requests the second trainee",
    () => request("/api/trainer-links", { method: "POST", form: { email: secondEmail } }),
    { status: 302, location: () => requestSentPath(secondEmail), exactLocation: true },
  ],
  [
    "second trainee signs in to accept",
    () => requestWith(secondJar, "/api/auth/signin", { method: "POST", form: { email: secondEmail, password } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "second trainee accepts the trainer request",
    () => acceptWith(secondJar, trainerId),
    { status: 302, location: hubPath("notice=accepted"), exactLocation: true },
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
    "legacy link function is gone",
    () => rpcWith(jar, "link_trainee_by_email", { p_email: unlinkedEmail }),
    { status: 404 },
  ],
  [
    "trainer direct request call is sent",
    () => rpcWith(jar, "request_trainee_link", { p_email: unlinkedEmail }),
    { status: 200, json: () => ({ value: "sent" }) },
  ],
  [
    "trainer direct request row is only pending",
    () => trainerLinkRest(unlinkedTraineeId),
    { status: 200, json: () => ({ linkStatus: "pending" }) },
  ],
  [
    "trainer direct request catalog is still the current month",
    () => request(`/api/measurements?month=2024-06&size=5&page=1&trainee=${unlinkedTraineeId}`),
    { status: 200, json: () => ({ dates: [utcCurrentMonth()], entriesLength: 0, pageCount: 1 }) },
  ],
  [
    "trainer measurement months while pending",
    () => measurementMonthsRpc(),
    { status: 200, json: () => ({ measuredMonths: [] }) },
  ],
  [
    "trainer request after the direct request is already pending",
    () => request("/api/trainer-links", { method: "POST", form: { email: unlinkedEmail } }),
    {
      status: 302,
      location: () => requestErrorPath(`A request to ${unlinkedEmail} is already pending`),
      exactLocation: true,
    },
  ],
  [
    "unlinked trainee signs in to accept",
    () => requestWith(unlinkedJar, "/api/auth/signin", { method: "POST", form: { email: unlinkedEmail, password } }),
    { status: 302, location: "/measurements" },
  ],
  [
    "unlinked trainee accepts the trainer request",
    () => acceptWith(unlinkedJar, trainerId),
    { status: 302, location: hubPath("notice=accepted"), exactLocation: true },
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
    "trainer re-request is already linked",
    () => request("/api/trainer-links", { method: "POST", form: { email: unlinkedEmail } }),
    { status: 302, location: () => requestErrorPath(`${unlinkedEmail} is already linked`), exactLocation: true },
  ],
  [
    "trainer removes the link",
    () => removeWith(jar, unlinkedTraineeId, "unlink"),
    { status: 302, location: hubPath("notice=unlinked"), exactLocation: true },
  ],
  [
    "trainee receives the unlink notification",
    () => newestNotificationRest(unlinkedJar),
    { status: 200, json: () => unreadNotification("link_removed", "trainer", trainerEmail) },
  ],
  [
    "trainer remove repeats with no link",
    () => removeWith(jar, unlinkedTraineeId, "unlink"),
    { status: 302, location: hubPath("error=failed"), exactLocation: true },
  ],
  [
    "trainer removed catalog is the current month",
    () => request(`/api/measurements?month=2024-01&size=5&page=1&trainee=${unlinkedTraineeId}`),
    { status: 200, json: () => ({ dates: [utcCurrentMonth()], entriesLength: 0, pageCount: 1 }) },
  ],
  [
    "trainer measurement months after the removal",
    () => measurementMonthsRpc(),
    { status: 200, json: () => ({ measuredMonths: [] }) },
  ],
  [
    "trainer requests the unlinked trainee again",
    () => request("/api/trainer-links", { method: "POST", form: { email: unlinkedEmail } }),
    { status: 302, location: () => requestSentPath(unlinkedEmail), exactLocation: true },
  ],
  [
    "unlinked trainee declines the trainer request",
    () => removeWith(unlinkedJar, trainerId, "decline"),
    { status: 302, location: hubPath("notice=declined"), exactLocation: true },
  ],
  [
    "trainer receives the decline notification",
    () => newestNotificationRest(jar),
    { status: 200, json: () => unreadNotification("link_declined", "trainee", unlinkedEmail) },
  ],
  [
    "trainer request after a decline is sent at once",
    () => request("/api/trainer-links", { method: "POST", form: { email: unlinkedEmail } }),
    { status: 302, location: () => requestSentPath(unlinkedEmail), exactLocation: true },
  ],
  [
    "trainer request after a decline is pending",
    () => trainerLinkRest(unlinkedTraineeId),
    { status: 200, json: () => ({ linkStatus: "pending" }) },
  ],
  [
    "trainer cancels the request after a decline",
    () => removeWith(jar, unlinkedTraineeId, "cancel"),
    { status: 302, location: hubPath("notice=cancelled"), exactLocation: true },
  ],
  [
    "trainee receives the cancel notification",
    () => newestNotificationRest(unlinkedJar),
    { status: 200, json: () => unreadNotification("link_cancelled", "trainer", trainerEmail) },
  ],
  [
    "notification insert over REST is refused",
    () =>
      notificationsRest(unlinkedJar, "", {
        method: "POST",
        prefer: "return=minimal",
        body: {
          recipient_id: unlinkedTraineeId,
          kind: "link_requested",
          actor_role: "trainer",
          actor_email: trainerEmail,
        },
      }),
    { status: [401, 403], body: "42501" },
  ],
  [
    "another user's notification is not readable",
    () => notificationsRest(unlinkedJar, `${notificationIdQuery(jar)}&select=id`),
    { status: 200, json: () => ({ arrayLength: 0 }) },
  ],
  [
    "another user's notification is not marked read",
    () =>
      notificationsRest(unlinkedJar, `${notificationIdQuery(jar)}&select=id`, {
        method: "PATCH",
        prefer: "return=representation",
        body: { read_at: new Date().toISOString() },
      }),
    { status: 200, json: () => ({ arrayLength: 0 }) },
  ],
  [
    "another user's notification is not deleted",
    () =>
      notificationsRest(unlinkedJar, `${notificationIdQuery(jar)}&select=id`, {
        method: "DELETE",
        prefer: "return=representation",
      }),
    { status: 200, json: () => ({ arrayLength: 0 }) },
  ],
  [
    "trainer decline notification is still there and unread",
    () => newestNotificationRest(jar),
    { status: 200, json: () => unreadNotification("link_declined", "trainee", unlinkedEmail) },
  ],
  [
    "own notification kind update is refused",
    () =>
      notificationsRest(unlinkedJar, notificationIdQuery(unlinkedJar), {
        method: "PATCH",
        prefer: "return=minimal",
        body: { kind: "link_removed" },
      }),
    { status: [401, 403], body: "42501" },
  ],
  [
    "own notification kind is unchanged",
    () => newestNotificationRest(unlinkedJar),
    { status: 200, json: () => unreadNotification("link_cancelled", "trainer", trainerEmail) },
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
    "profile names save",
    () =>
      request("/api/profile", {
        method: "POST",
        form: { firstName: ` ${profileFirstName} `, lastName: profileLastName },
      }),
    { status: 302, location: "/profile?notice=profile-saved", exactLocation: true },
  ],
  [
    "profile names are stored",
    () => traineeProfileRest(),
    {
      status: 200,
      json: () => ({ profileRow: { role: "trainee", first_name: profileFirstName, last_name: profileLastName } }),
    },
  ],
  [
    "profile renders the saved names",
    () => request("/profile"),
    { status: 200, body: [`value="${profileFirstName}"`, `value="${profileLastName}"`] },
  ],
  [
    "profile rejects a 51-character first name",
    () => request("/api/profile", { method: "POST", form: { firstName: "a".repeat(51), lastName: profileLastName } }),
    { status: 302, location: "/profile?error=", locationIncludes: "first-name-long" },
  ],
  [
    "profile names survive the rejected save",
    () => traineeProfileRest(),
    {
      status: 200,
      json: () => ({ profileRow: { role: "trainee", first_name: profileFirstName, last_name: profileLastName } }),
    },
  ],
  [
    "profile save ignores a role field",
    () =>
      request("/api/profile", {
        method: "POST",
        form: { firstName: profileFirstName, lastName: profileLastName, role: "trainer", email: unknownEmail },
      }),
    { status: 302, location: "/profile?notice=profile-saved", exactLocation: true },
  ],
  [
    "profile role stays trainee after the save",
    () => traineeProfileRest(),
    {
      status: 200,
      json: () => ({ profileRow: { role: "trainee", first_name: profileFirstName, last_name: profileLastName } }),
    },
  ],
  [
    "trainee journal still renders after the role field",
    () => request("/measurements"),
    { status: 200, body: ["Add measurement", earlierNote], forbid: "Find trainee by email" },
  ],
  [
    "profile empty fields clear the names",
    () => request("/api/profile", { method: "POST", form: { firstName: "", lastName: "  " } }),
    { status: 302, location: "/profile?notice=profile-saved", exactLocation: true },
  ],
  [
    "profile names are cleared",
    () => traineeProfileRest(),
    { status: 200, json: () => ({ profileRow: { role: "trainee", first_name: null, last_name: null } }) },
  ],
  [
    "profile form no longer shows the cleared names",
    () => request("/profile"),
    { status: 200, forbid: [`value="${profileFirstName}"`, `value="${profileLastName}"`] },
  ],
  [
    "avatar upload saves a PNG",
    () => request("/api/profile/avatar", { method: "POST", multipart: { intent: "upload", avatar: avatarPngFile() } }),
    { status: 302, location: "/profile/avatar?notice=avatar-saved", exactLocation: true },
  ],
  [
    "avatar path is in the trainee's folder",
    () => traineeAvatarRest(),
    { status: 200, json: () => ({ avatarPathPrefix: `${traineeId}/` }) },
  ],
  ["avatar public URL serves the PNG", () => avatarPublicObject(), { status: 200, contentType: "image/png" }],
  [
    "avatar upload rejects a text file declared as PNG",
    () => request("/api/profile/avatar", { method: "POST", multipart: { intent: "upload", avatar: fakePngFile() } }),
    { status: 302, location: "/profile/avatar?error=avatar-type", exactLocation: true },
  ],
  [
    "avatar upload rejects a body over the size limit",
    () =>
      request("/api/profile/avatar", { method: "POST", multipart: { intent: "upload", avatar: oversizedPngFile() } }),
    { status: 302, location: "/profile/avatar?error=avatar-large", exactLocation: true },
  ],
  [
    "avatar path rejects another user's folder",
    () => foreignAvatarPathRest(`${secondTraineeId}/foreign.png`),
    { status: 400, body: "23514" },
  ],
  [
    "avatar path rejects a climb out of the own folder",
    () => foreignAvatarPathRest(`${traineeId}/../${secondTraineeId}/foreign.png`),
    { status: 400, body: "23514" },
  ],
  [
    "avatar remove clears the avatar",
    () => request("/api/profile/avatar", { method: "POST", multipart: { intent: "remove" } }),
    { status: 302, location: "/profile/avatar?notice=avatar-removed", exactLocation: true },
  ],
  ["avatar path is cleared", () => traineeAvatarRest(), { status: 200, json: () => ({ avatarPathPrefix: null }) }],
  ["avatar old public URL is gone", () => avatarPublicObject(), { status: [400, 404] }],
  [
    "signin shows forgot password",
    () => request("/auth/signin"),
    { status: 200, body: ["Forgot password?", 'href="/auth/reset-password"'] },
  ],
  [
    "unknown email reset looks sent",
    () => request("/api/auth/reset-password", { method: "POST", form: { email: unknownEmail } }),
    { status: 302, location: "/auth/reset-password?notice=reset-sent", exactLocation: true },
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
    { status: 302, location: "/settings?error=current-password", exactLocation: true },
  ],
  ["profile other session stays signed in", () => requestWith(jarB, "/settings"), { status: 200 }],
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
    { status: 302, location: "/settings?notice=password-changed", exactLocation: true },
  ],
  ["profile stays signed in after the change", () => requestWith(jarA, "/settings"), { status: 200 }],
  ["profile other session ends", () => requestWith(jarB, "/settings"), { status: 302, location: "/auth/signin" }],
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
  if (spec.arrayLength !== undefined) {
    const length = Array.isArray(parsed) ? parsed.length : -1;
    if (length !== spec.arrayLength) {
      problems.push(`array length ${length} expected ${spec.arrayLength}`);
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
  if (spec.profileRow !== undefined) {
    const row = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : undefined;
    const same =
      row && typeof row === "object" && Object.keys(spec.profileRow).every((key) => row[key] === spec.profileRow[key]);
    if (!same) {
      problems.push(`profile row ${JSON.stringify(parsed)} expected ${JSON.stringify([spec.profileRow])}`);
    }
  }
  if (spec.avatarPathPrefix !== undefined) {
    const row = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : undefined;
    const path = row && typeof row === "object" ? row.avatar_path : undefined;
    const same =
      spec.avatarPathPrefix === null
        ? path === null
        : typeof path === "string" &&
          path.startsWith(spec.avatarPathPrefix) &&
          path.length > spec.avatarPathPrefix.length;
    if (!same) {
      problems.push(
        `avatar_path ${JSON.stringify(path ?? null)} expected ${spec.avatarPathPrefix === null ? "null" : `to start with ${JSON.stringify(spec.avatarPathPrefix)}`}`,
      );
    }
  }
  if (spec.value !== undefined && parsed !== spec.value) {
    problems.push(`value ${JSON.stringify(parsed)} expected ${JSON.stringify(spec.value)}`);
  }
  if (spec.linkStatus !== undefined) {
    const row = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : undefined;
    const status = row && typeof row === "object" ? row.status : undefined;
    if (status !== spec.linkStatus) {
      problems.push(`link rows ${JSON.stringify(parsed)} expected one with status ${JSON.stringify(spec.linkStatus)}`);
    }
  }
  if (spec.notification !== undefined) {
    const row = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : undefined;
    const same =
      row &&
      typeof row === "object" &&
      Object.keys(spec.notification).every((key) => row[key] === spec.notification[key]);
    if (!same) {
      problems.push(`notification rows ${JSON.stringify(parsed)} expected ${JSON.stringify([spec.notification])}`);
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
  const statusOk = Array.isArray(expected.status)
    ? expected.status.includes(actual.status)
    : actual.status === expected.status;
  const contentTypeOk =
    expected.contentType === undefined || (actual.contentType ?? "").startsWith(expected.contentType);
  const ok =
    statusOk && contentTypeOk && locationOk && bodyOk && bodyAnyOk && forbidOk && measurementOk && jsonResult.ok;
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
    const expectedContentType =
      expected.contentType !== undefined
        ? ` content-type ${JSON.stringify(expected.contentType)} (got ${JSON.stringify(actual.contentType ?? "")})`
        : "";
    const expectedStatus = Array.isArray(expected.status) ? expected.status.join("/") : expected.status;
    console.log(
      `      expected ${expectedStatus} ${expectedLocation}${expectedBody}${expectedBodyAny}${expectedForbid}${expectedMeasurement}${expectedContentType}${jsonResult.detail}`,
    );
  }
}

console.log(failed ? `\n${failed} step(s) failed` : "\nAll smoke steps passed");
process.exit(failed ? 1 : 0);
