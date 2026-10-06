// Proves the newest local migration leaves one known measurement row unchanged.
// Zero npm dependencies. Requires a running local Supabase stack.

import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase", "migrations");

const email = "migration-check@example.com";
const password = "migration-check-password";
const preservedToken = "migration-check-preserved";
const measurementsReadyToken = "migration-check-measurements-ready";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const migrationNamePattern = /^([0-9]+)_.+\.sql$/;

function printOut(line) {
  writeSync(1, `${line}\n`);
}

function supabaseExecutable() {
  if (process.platform === "win32") {
    const exe = join(root, "node_modules", "@supabase", "cli-windows-x64", "bin", "supabase.exe");
    if (existsSync(exe)) return exe;
  }
  return "supabase";
}

function runSupabase(args, { capture = false } = {}) {
  return spawnSync(supabaseExecutable(), args, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

function capturedOutput(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function commandFailed(args, result) {
  if (result.error) {
    console.error(`supabase ${args.join(" ")} failed to start: ${result.error.message}`);
    return true;
  }
  if (result.status === 0) return false;
  const detail = capturedOutput(result).trim();
  if (detail) console.error(detail);
  return true;
}

function listMigrationFiles() {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

function timestampOf(filename) {
  const match = migrationNamePattern.exec(filename);
  return match ? match[1] : "";
}

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    env[line.slice(0, separator)] = unquoteEnvValue(line.slice(separator + 1));
  }
  return env;
}

function unquoteEnvValue(raw) {
  if (raw.length < 2 || !raw.startsWith('"') || !raw.endsWith('"')) return raw;
  let out = "";
  const body = raw.slice(1, -1);
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char !== "\\" || index + 1 >= body.length) {
      out += char;
      continue;
    }
    const next = body[index + 1];
    if (next === "n") out += "\n";
    else if (next === "r") out += "\r";
    else if (next === "t") out += "\t";
    else out += next;
    index += 1;
  }
  return out;
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  return Buffer.from(`${base64}${"=".repeat(pad)}`, "base64").toString("utf8");
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

function userIdFromSignup(body) {
  const direct = userIdFromSession(body);
  if (direct) return direct;
  if (!body || typeof body !== "object" || !("session" in body)) return "";
  return userIdFromSession(body.session);
}

async function signUp(apiUrl, anonKey) {
  let response;
  try {
    response = await fetch(`${apiUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        data: { role: "trainee" },
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`signup failed: ${message}`);
    return "";
  }

  const text = await response.text();
  if (!response.ok) {
    console.error(`signup failed: ${response.status} ${text}`);
    return "";
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("signup response was not JSON");
    return "";
  }

  const userId = userIdFromSignup(body);
  if (!uuidPattern.test(userId)) {
    console.error("signup response did not include a user id");
    return "";
  }
  return userId;
}

function runQuery(tempDir, name, sql) {
  const file = join(tempDir, name);
  writeFileSync(file, sql, "utf8");
  const args = ["db", "query", "--local", "--file", file];
  return { args, result: runSupabase(args, { capture: true }) };
}

function outputHas(result, token) {
  return result.status === 0 && capturedOutput(result).includes(token);
}

function appliedMigrationNames(output) {
  return [...output.matchAll(/Applying migration (\S+)\.\.\./g)].map((match) => match[1]);
}

function measurementsReadySql() {
  return `select case
  when to_regclass('public.measurements') is null then 'migration-check-missing-measurements'
  else 'migration-check-' || 'measurements-ready'
end;
`;
}

function profileSql(userId) {
  return `insert into public.profiles (id, role)
values ('${userId}'::uuid, 'trainee');
`;
}

function measurementSql(userId) {
  return `insert into public.measurements (
  trainee_id,
  measured_on,
  weight_kg,
  chest_cm,
  waist_cm,
  arms_cm,
  thigh_cm,
  calf_cm,
  hips_cm,
  navel_cm,
  note
) values (
  '${userId}'::uuid,
  '2026-01-01',
  80.0,
  50.0,
  50.0,
  50.0,
  50.0,
  50.0,
  50.0,
  50.0,
  null
);
`;
}

function preservedSql(userId) {
  return `select case
  when count(*) = 1
    and bool_and(weight_kg = 80.0)
    and bool_and(chest_cm = 50.0)
    and bool_and(waist_cm = 50.0)
    and bool_and(arms_cm = 50.0)
    and bool_and(thigh_cm = 50.0)
    and bool_and(calf_cm = 50.0)
    and bool_and(hips_cm = 50.0)
    and bool_and(navel_cm = 50.0)
    and bool_and(trainee_id = '${userId}'::uuid)
  then 'migration-check-' || 'preserved'
  else 'migration-check-changed'
end
from public.measurements;
`;
}

async function main() {
  const files = listMigrationFiles();
  const newestName = files.at(-1);
  const previousName = files.at(-2);
  if (!newestName || !previousName) {
    console.error("supabase/migrations needs at least two SQL files");
    return 1;
  }

  const resetVersion = timestampOf(previousName);
  if (!resetVersion || !timestampOf(newestName)) {
    console.error("migration filenames must start with a numeric timestamp");
    return 1;
  }

  // Flush before spawn so this line is visible before the local database changes.
  printOut(`The local database will be reset to version ${resetVersion}.`);
  const resetArgs = ["db", "reset", "--version", resetVersion, "--no-seed"];
  if (commandFailed(resetArgs, runSupabase(resetArgs))) return 1;

  const statusArgs = ["status", "-o", "env"];
  const status = runSupabase(statusArgs, { capture: true });
  if (commandFailed(statusArgs, status)) return 1;

  const env = parseEnv(status.stdout ?? "");
  const apiUrl = (env.API_URL ?? "").replace(/\/$/, "");
  const anonKey = env.ANON_KEY ?? "";
  if (!apiUrl || !anonKey) {
    console.error("supabase status did not report API_URL and ANON_KEY");
    return 1;
  }

  const userId = await signUp(apiUrl, anonKey);
  if (!userId) return 1;

  const tempDir = mkdtempSync(join(tmpdir(), "migration-check-"));
  try {
    const ready = runQuery(tempDir, "measurements-ready.sql", measurementsReadySql());
    if (commandFailed(ready.args, ready.result)) return 1;
    if (!outputHas(ready.result, measurementsReadyToken)) {
      console.error("public.measurements is missing after reset");
      return 1;
    }

    const profile = runQuery(tempDir, "profile.sql", profileSql(userId));
    if (commandFailed(profile.args, profile.result)) return 1;

    const measurement = runQuery(tempDir, "measurement.sql", measurementSql(userId));
    if (commandFailed(measurement.args, measurement.result)) return 1;

    const upArgs = ["migration", "up"];
    const up = runSupabase(upArgs, { capture: true });
    const applied = appliedMigrationNames(capturedOutput(up));
    const appliedOnlyNewest = up.status === 0 && applied.length === 1 && applied[0] === newestName;
    if (!appliedOnlyNewest) {
      const appliedLabel = applied.length === 0 ? "nothing" : applied.join(", ");
      console.error(`migration up must apply only ${newestName}; applied ${appliedLabel}`);
      if (up.error) console.error(up.error.message);
      else if (up.status !== 0) {
        const detail = capturedOutput(up).trim();
        if (detail) console.error(detail);
      }
      return 1;
    }

    printOut(`Applied migration ${newestName}.`);

    const preserved = runQuery(tempDir, "preserved.sql", preservedSql(userId));
    if (commandFailed(preserved.args, preserved.result)) return 1;
    if (!outputHas(preserved.result, preservedToken)) {
      console.error("measurement row was not preserved");
      return 1;
    }
    return 0;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
