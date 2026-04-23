const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const DEMO_USER_ID = "9248265d-ff16-4d26-a989-5ccb01fea6e2";

async function main() {
  console.log("=" .repeat(60));
  console.log("Добавляю demo@rtrader.com во все чаты...");
  console.log("=" .repeat(60));

  // Get all chats
  const { data: chats, error: chatsError } = await supabase
    .from("chats")
    .select("id, name, type");

  if (chatsError) {
    console.error("❌ Ошибка при получении чатов:", chatsError.message);
    process.exit(1);
  }

  console.log(`\n✅ Найдено чатов: ${chats.length}`);

  // Add to chat_participants
  console.log("\n🔄 Добавляю в chat_participants...");
  
  const participantsData = chats.map(chat => ({
    chat_id: chat.id,
    user_id: DEMO_USER_ID,
    role: chat.type === "info_only" ? "subscriber" : "participant",
    joined_at: new Date().toISOString()
  }));

  const { error: participantsError } = await supabase
    .from("chat_participants")
    .upsert(participantsData, { onConflict: "chat_id,user_id" });

  if (participantsError) {
    console.error("❌ Ошибка при добавлении в chat_participants:", participantsError.message);
    process.exit(1);
  }

  console.log(`✅ Добавлено в chat_participants: ${participantsData.length} записей`);

  // Add to chat_settings
  console.log("\n🔄 Добавляю в chat_settings...");
  
  const settingsData = chats.map(chat => ({
    chat_id: chat.id,
    user_id: DEMO_USER_ID,
    is_muted: false,
    muted_until: null
  }));

  const { error: settingsError } = await supabase
    .from("chat_settings")
    .upsert(settingsData, { onConflict: "chat_id,user_id" });

  if (settingsError) {
    console.error("❌ Ошибка при добавлении в chat_settings:", settingsError.message);
    process.exit(1);
  }

  console.log(`✅ Добавлено в chat_settings: ${settingsData.length} записей`);

  // Verify results
  console.log("\n" + "=".repeat(60));
  console.log("✅ Проверка результатов:");
  console.log("=".repeat(60));

  const { data: verifyParticipants, error: verifyParticipantsError } = await supabase
    .from("chat_participants")
    .select("*")
    .eq("user_id", DEMO_USER_ID);

  if (!verifyParticipantsError) {
    console.log(`\n📊 chat_participants для demo@rtrader.com: ${verifyParticipants.length} записей`);
  }

  const { data: verifySettings, error: verifySettingsError } = await supabase
    .from("chat_settings")
    .select("*")
    .eq("user_id", DEMO_USER_ID);

  if (!verifySettingsError) {
    console.log(`📊 chat_settings для demo@rtrader.com: ${verifySettings.length} записей`);
  }

  // List all chats
  console.log("\n" + "=".repeat(60));
  console.log("📋 Список всех чатов для demo@rtrader.com:");
  console.log("=".repeat(60));

  const { data: userChats, error: userChatsError } = await supabase
    .from("chat_participants")
    .select("chat_id, role, chats(id, name, type)")
    .eq("user_id", DEMO_USER_ID)
    .order("chats(name)");

  if (!userChatsError && userChats) {
    userChats.forEach((item, i) => {
      const chat = item.chats;
      console.log(`${i + 1}. ${chat.name} (тип: ${chat.type}, роль: ${item.role})`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ ВСЕ ОПЕРАЦИИ УСПЕШНО ВЫПОЛНЕНЫ!");
  console.log("=".repeat(60));
  console.log(`\n📈 Итоги:`);
  console.log(`   • Добавлено в chat_participants: ${participantsData.length}`);
  console.log(`   • Добавлено в chat_settings: ${settingsData.length}`);
  console.log(`   • Всего чатов для demo@rtrader.com: ${chats.length}`);
}

main().catch(error => {
  console.error("❌ Ошибка:", error);
  process.exit(1);
});
