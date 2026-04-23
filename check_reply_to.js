const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://vfxezndvkaxlimthkeyx.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // Test new query syntax
  const { data: messages, error } = await supabase
    .from("messages")
    .select(`
      id,
      content,
      reply_to_message_id,
      reply_to_msg:messages!messages_reply_to_message_id_fkey(
        id,
        content,
        user_id,
        profiles(username)
      )
    `)
    .eq("chat_id", "6d30606d-b155-4b2b-b814-ac9681a490f6")
    .limit(5);
  
  if (error) {
    console.error("Error with new syntax:", error.message);
    
    // Try alternative syntax
    console.log("\nTrying alternative syntax...");
    const { data: messages2, error: error2 } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        reply_to_message_id,
        parent_msg:messages(
          id,
          content,
          profiles(username)
        )
      `)
      .eq("chat_id", "6d30606d-b155-4b2b-b814-ac9681a490f6")
      .limit(5);
    
    if (error2) {
      console.error("Error with alt syntax:", error2.message);
    } else {
      console.log("Alt syntax works:", JSON.stringify(messages2?.slice(0, 2), null, 2));
    }
    return;
  }
  
  console.log("New syntax works! Messages:", JSON.stringify(messages?.slice(0, 3), null, 2));
}

main().catch(console.error);
