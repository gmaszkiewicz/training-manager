// Fails when home view files use literal colours, arbitrary px/rem sizes, or Tailwind palette colour utilities.
// Zero dependencies. Exit 0 when clean; non-zero when a match is found.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FILES = [
  "src/components/Welcome.astro",
  "src/components/Topbar.astro",
  "src/pages/index.astro",
  "src/components/home/HomeActions.tsx",
  "src/components/TopbarActions.tsx",
  "src/pages/auth/signin.astro",
  "src/pages/auth/signup.astro",
  "src/pages/auth/confirm-email.astro",
  "src/components/auth/SignInForm.tsx",
  "src/components/auth/SignUpForm.tsx",
  "src/components/auth/FormField.tsx",
  "src/components/auth/SubmitButton.tsx",
  "src/components/auth/ServerError.tsx",
  "src/components/auth/PasswordToggle.tsx",
  "src/components/measurements/MeasurementForm.tsx",
  "src/components/journal/TraineeJournal.astro",
  "src/components/measurements/MeasurementList.astro",
  "src/components/trainer/TrainerPanel.astro",
  "src/pages/kitchen-sink/home.astro",
  "src/pages/kitchen-sink/journal.astro",
  "src/pages/kitchen-sink/trainer.astro",
  "src/pages/dashboard.astro",
];

const PATTERN =
  /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|-\[[0-9.]+(px|rem)\]|\b(bg|text|border|ring|outline|from|via|to|fill|stroke|shadow|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/g;

const root = resolve(import.meta.dirname, "..");
let failed = false;

for (const relative of FILES) {
  const absolute = resolve(root, relative);
  const source = readFileSync(absolute, "utf8");
  const matches = [...source.matchAll(PATTERN)];
  if (matches.length === 0) continue;

  failed = true;
  console.error(`${relative}:`);
  for (const match of matches) {
    const index = match.index ?? 0;
    const line = source.slice(0, index).split("\n").length;
    console.error(`  L${line}: ${match[0]}`);
  }
}

if (failed) {
  console.error("check:home-tokens failed — replace literal colours / palette utilities with role tokens.");
  process.exit(1);
}

console.log("check:home-tokens: clean");
