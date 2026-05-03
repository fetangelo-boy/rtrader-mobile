// Script to apply a SQL migration directly via Supabase REST API
// Usage: tsx scripts/apply-migration.ts <sql_file>

import * as fs from "fs";
import * as path from "path";

const supabaseUrl = "https://vfxezndvkaxlimthkeyx.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set");
  process.exit(1);
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("❌ Usage: tsx scripts/apply-migration.ts <sql_file>");
  process.exit(1);
}

const sqlPath = path.resolve(sqlFile);
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ File not found: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf-8");
console.log(`📄 Applying migration: ${sqlFile}`);
console.log(`SQL:\n${sql}\n`);

async function applyMigration() {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: serviceKey!,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    // Try the pg endpoint instead
    const pgResponse = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers: {
        apikey: serviceKey!,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!pgResponse.ok) {
      const errorText = await pgResponse.text();
      console.error(`❌ Migration failed: ${pgResponse.status} ${errorText}`);
      process.exit(1);
    }

    const result = await pgResponse.json();
    console.log("✅ Migration applied successfully via pg endpoint:", result);
    return;
  }

  const result = await response.json();
  console.log("✅ Migration applied successfully:", result);
}

applyMigration().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
