const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

console.log("=" .repeat(60));
console.log("Подключаюсь к Supabase PostgreSQL базе данных...");
console.log("=" .repeat(60));
console.log(`URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  try {
    // First, verify demo@rtrader.com exists
    console.log("\n🔍 Проверяю наличие demo@rtrader.com...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, username")
      .eq("email", "demo@rtrader.com")
      .single();

    if (profileError) {
      console.error("❌ Ошибка при поиске профиля:", profileError.message);
      process.exit(1);
    }

    if (!profile) {
      console.error("❌ Профиль demo@rtrader.com не найден");
      process.exit(1);
    }

    console.log(`✅ Профиль найден: ${profile.email} (ID: ${profile.id})`);
    console.log(`   Username: ${profile.username || "не заполнено"}`);

    // Get all chats
    console.log("\n🔍 Получаю список всех чатов...");
    const { data: chats, error: chatsError } = await supabase
      .from("chats")
      .select("id, name, type");

    if (chatsError) {
      console.error("❌ Ошибка при получении чатов:", chatsError.message);
      process.exit(1);
    }

    console.log(`✅ Найдено чатов: ${chats.length}`);

    // Add to chat_participants
    console.log("\n🔄 Добавляю demo@rtrader.com в chat_participants...");
    
    const participantsData = chats.map(chat => ({
      chat_id: chat.id,
      user_id: profile.id,
      role: chat.type === "info_only" ? "subscriber" : "participant",
      joined_at: new Date().toISOString()
    }));

    const { error: participantsError, count: participantsCount } = await supabase
      .from("chat_participants")
      .upsert(participantsData, { onConflict: "chat_id,user_id" });

    if (participantsError) {
      console.error("❌ Ошибка при добавлении в chat_participants:", participantsError.message);
      process.exit(1);
    }

    console.log(`✅ Добавлено/обновлено в chat_participants: ${participantsData.length} записей`);

    // Add to chat_settings
    console.log("\n🔄 Добавляю chat_settings для demo@rtrader.com...");
    
    const settingsData = chats.map(chat => ({
      chat_id: chat.id,
      user_id: profile.id,
      is_muted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: settingsError, count: settingsCount } = await supabase
      .from("chat_settings")
      .upsert(settingsData, { onConflict: "chat_id,user_id" });

    if (settingsError) {
      console.error("❌ Ошибка при добавлении в chat_settings:", settingsError.message);
      process.exit(1);
    }

    console.log(`✅ Добавлено/обновлено в chat_settings: ${settingsData.length} записей`);

    // Verify results
    console.log("\n" + "=".repeat(60));
    console.log("✅ Проверка результатов:");
    console.log("=".repeat(60));

    const { data: verifyParticipants, error: verifyParticipantsError } = await supabase
      .from("chat_participants")
      .select("*")
      .eq("user_id", profile.id);

    if (!verifyParticipantsError) {
      console.log(`\n📊 chat_participants для demo@rtrader.com: ${verifyParticipants.length} записей`);
    }

    const { data: verifySettings, error: verifySettingsError } = await supabase
      .from("chat_settings")
      .select("*")
      .eq("user_id", profile.id);

    if (!verifySettingsError) {
      console.log(`📊 chat_settings для demo@rtrader.com: ${verifySettings.length} записей`);
    }

    // List all chats
    console.log("\n" + "=".repeat(60));
    console.log("📋 Список всех чатов для demo@rtrader.com:");
    console.log("=".repeat(60));

    const { data: userChats, error: userChatsError } = await supabase
      .from("chat_participants")
      .select("chats(id, name, type), role")
      .eq("user_id", profile.id);

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

  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  }
}

main();
