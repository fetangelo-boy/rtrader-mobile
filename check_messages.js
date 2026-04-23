const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://vfxezndvkaxlimthkeyx.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: messages, error } = await supabase
    .from("messages")
    .select(`
      id,
      content,
      user_id,
      created_at,
      profiles(username, avatar_url)
    `)
    .limit(5);
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Messages with profiles:", JSON.stringify(messages, null, 2));
}

main().catch(console.error);
