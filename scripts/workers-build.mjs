// Workers Builds build command: applies Supabase migrations on `main`, then builds the Worker.
// Other branches (preview builds) must never push migrations to the hosted database.

import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.WORKERS_CI_BRANCH === "main") {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error("SUPABASE_DB_URL is not set; refusing to build main without applying migrations.");
    process.exit(1);
  }
  // Supabase CLI v3: hosted pushes need --yes when not run from a terminal; --db-url is deprecated.
  run("npx", ["supabase", "db", "push", `--remote=${dbUrl}`, "--yes"]);
}

run("npm", ["run", "build"]);
