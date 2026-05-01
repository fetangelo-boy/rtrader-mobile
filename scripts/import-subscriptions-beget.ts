import * as fs from "fs";
import mysql from "mysql2/promise";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "rtrader";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "rtrader_unified";

interface SupabaseSubscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

async function importSubscriptions() {
  console.log("📥 Importing subscriptions to MySQL...");

  // Read export file
  if (!fs.existsSync("SUPABASE_SUBSCRIPTIONS_EXPORT.json")) {
    console.error("❌ SUPABASE_SUBSCRIPTIONS_EXPORT.json not found");
    process.exit(1);
  }

  const data = JSON.parse(
    fs.readFileSync("SUPABASE_SUBSCRIPTIONS_EXPORT.json", "utf-8")
  ) as SupabaseSubscription[];

  console.log(`📋 Found ${data.length} subscriptions to import`);

  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  let imported = 0;
  let failed = 0;

  for (const sub of data) {
    try {
      await connection.execute(
        `INSERT INTO subscriptions (id, userId, plan, status, startedAt, expiresAt, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sub.id,
          sub.user_id,
          sub.plan,
          sub.status,
          new Date(sub.started_at),
          sub.expires_at ? new Date(sub.expires_at) : null,
          new Date(sub.created_at),
          new Date(sub.updated_at),
        ]
      );
      imported++;
    } catch (error: any) {
      console.error(`❌ Failed to import subscription ${sub.id}:`, error.message);
      failed++;
    }
  }

  await connection.end();

  console.log(`\n✅ Import complete: ${imported} imported, ${failed} failed`);
}

importSubscriptions().catch(console.error);
