/**
 * One-off migration: read data/db.json and upsert all checklist_days into Supabase.
 *
 * Usage (from project root):
 *   node --env-file=.env.local scripts/migrate-to-supabase.mjs
 * or if you have dotenv installed:
 *   node -r dotenv/config scripts/migrate-to-supabase.mjs dotenv_config_path=.env.local
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

// Load .env.local if present (Node 18+ doesn't have --env-file, so we do it manually)
const envPath = path.join(projectRoot, ".env.local");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local or the environment."
  );
  process.exit(1);
}

const dbPath = path.join(projectRoot, "data", "db.json");
if (!fs.existsSync(dbPath)) {
  console.error("data/db.json not found.");
  process.exit(1);
}

const raw = fs.readFileSync(dbPath, "utf8");
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error("Invalid JSON in data/db.json:", e.message);
  process.exit(1);
}

const checklists = data.checklists || {};
if (Object.keys(checklists).length === 0) {
  console.log("No checklists in db.json. Nothing to migrate.");
  process.exit(0);
}

const supabase = createClient(url, key);
const rows = [];

for (const dateKey of Object.keys(checklists)) {
  const day = checklists[dateKey];
  if (day && typeof day === "object") {
    for (const userId of ["jasmin", "kelsey"]) {
      const completed = day[userId];
      if (completed && typeof completed === "object") {
        rows.push({ date_key: dateKey, user_id: userId, completed });
      }
    }
  }
}

console.log(`Migrating ${rows.length} rows (${Object.keys(checklists).length} days) to Supabase...`);

const TABLE = "checklist_days";
const BATCH = 50;
let ok = 0;
let err = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await supabase
    .from(TABLE)
    .upsert(chunk, { onConflict: "date_key,user_id" });
  if (error) {
    console.error("Supabase error:", error.message);
    err += chunk.length;
  } else {
    ok += chunk.length;
    console.log(`  ${ok}/${rows.length} rows upserted`);
  }
}

console.log(`Done. ${ok} rows upserted, ${err} errors.`);
