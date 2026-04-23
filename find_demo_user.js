const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("Ищу demo@rtrader.com в Supabase...\n");

  // Try to get from auth.users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error("Error listing users:", usersError.message);
  } else {
    console.log("Users in Supabase:");
    users.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });

    const demoUser = users.find(u => u.email === "demo@rtrader.com");
    if (demoUser) {
      console.log(`\n✅ Found demo@rtrader.com with ID: ${demoUser.id}`);
    }
  }

  // Try to get chats
  console.log("\n\nChats in database:");
  const { data: chats, error: chatsError } = await supabase
    .from("chats")
    .select("*");

  if (chatsError) {
    console.error("Error getting chats:", chatsError.message);
  } else {
    console.log(`Found ${chats.length} chats:`);
    chats.forEach(chat => {
      console.log(`  - ${chat.name} (ID: ${chat.id}, type: ${chat.type})`);
    });
  }
}

main();
