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
      reply_to_message_id,
      profiles(username),
      reply_to:messages!reply_to_message_id(
        id,
        content,
        user_id,
        profiles(username)
      )
    `)
    .eq("chat_id", "6d30606d-b155-4b2b-b814-ac9681a490f6")
    .order("created_at", { ascending: true });
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Messages:", JSON.stringify(messages, null, 2));
}

main().catch(console.error);
