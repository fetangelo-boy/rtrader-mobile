const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from("chat_settings")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error:", error.message);
  } else if (data && data.length > 0) {
    console.log("chat_settings structure:");
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log("No chat_settings found, checking if table exists...");
    // Try to insert a test record to see what columns are expected
    const { error: insertError } = await supabase
      .from("chat_settings")
      .insert([{
        chat_id: "test",
        user_id: "test"
      }]);
    console.log("Insert error:", insertError?.message);
  }
}

main();
