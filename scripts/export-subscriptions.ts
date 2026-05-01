import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const supabaseUrl = process.env.SUPABASE_URL || "https://xyzabc.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "";

if (!supabaseKey) {
  console.error("❌ SUPABASE_KEY not set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportSubscriptions() {
  console.log("📤 Exporting subscriptions from Supabase...");

  const { data, error } = await supabase.from("subscriptions").select("*");

  if (error) {
    console.error("❌ Error exporting subscriptions:", error);
    process.exit(1);
  }

  console.log(`✅ Exported ${data?.length || 0} subscriptions`);

  // Save to JSON
  fs.writeFileSync(
    "SUPABASE_SUBSCRIPTIONS_EXPORT.json",
    JSON.stringify(data, null, 2)
  );

  console.log("✅ Saved to SUPABASE_SUBSCRIPTIONS_EXPORT.json");

  // Show sample
  if (data && data.length > 0) {
    console.log("\n📋 Sample subscription:");
    console.log(JSON.stringify(data[0], null, 2));
  }
}

exportSubscriptions().catch(console.error);
