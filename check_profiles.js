const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://vfxezndvkaxlimthkeyx.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // Check profiles
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(10);
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Profiles:", JSON.stringify(profiles, null, 2));
  
  // Check auth.users for demo user
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  const demoUser = authUsers.users.find(u => u.email === "demo@rtrader.com");
  console.log("Demo user:", JSON.stringify(demoUser, null, 2));
}

main().catch(console.error);
