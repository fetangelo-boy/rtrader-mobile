const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Get profiles table structure
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Profiles table structure:");
    if (data && data.length > 0) {
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log("No profiles found");
    }
  }

  // Try to get all tables
  const { data: tables, error: tablesError } = await supabase.rpc("get_tables");
  if (!tablesError && tables) {
    console.log("\nTables in Supabase:");
    console.log(tables);
  }
}

main();
