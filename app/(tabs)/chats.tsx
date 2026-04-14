import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import { useRouter } from "expo-router";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  name: string;
  type: "interactive" | "informational";
  unreadCount?: number;
  isMuted?: boolean;
}

const CHATS: Chat[] = [
  // Интерактивные чаты (5)
  { id: "1", name: "Газ / нефть", type: "interactive", unreadCount: 3 },
  { id: "2", name: "Продуктовый", type: "interactive", unreadCount: 0 },
  { id: "3", name: "Металлы", type: "interactive", unreadCount: 5 },
  { id: "4", name: "Чат", type: "interactive", unreadCount: 1 },
  { id: "5", name: "Технические вопросы", type: "interactive", unreadCount: 0 },
  // Информационные чаты (3)
  { id: "6", name: "Прихожая", type: "informational", unreadCount: 2 },
  { id: "7", name: "Интрадей и мысли", type: "informational", unreadCount: 0 },
  { id: "8", name: "Видео-разборы", type: "informational", unreadCount: 0 },
];

export default function ChatsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>(CHATS);

  const handleChatPress = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const toggleMute = (chatId: string, e: any) => {
    e.stopPropagation();
    setChats(
      chats.map((chat) =>
        chat.id === chatId ? { ...chat, isMuted: !chat.isMuted } : chat
      )
    );
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <Pressable
      onPress={() => handleChatPress(item.id)}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        className={cn(
          "flex-row items-center px-4 py-3 border-b",
          item.isMuted && "opacity-60"
        )}
        style={{ borderBottomColor: colors.border }}
      >
        {/* Иконка типа чата */}
        <View
          className={cn(
            "w-2 h-2 rounded-full mr-3",
            item.type === "interactive"
              ? "bg-cyan-400"
              : "bg-violet-400"
          )}
        />

        {/* Название и информация */}
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-foreground"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {item.type === "interactive"
              ? "Интерактивный"
              : "Информационный"}
            {item.isMuted && " • 🔕 Без уведомлений"}
          </Text>
        </View>

        {/* Счётчик непрочитанных */}
        {item.unreadCount! > 0 && !item.isMuted && (
          <View
            className="w-6 h-6 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-xs font-bold text-background">
              {item.unreadCount}
            </Text>
          </View>
        )}

        {/* Кнопка mute */}
        <Pressable
          onPress={(e) => toggleMute(item.id, e)}
          className="p-2 -mr-2"
        >
          <Text className="text-lg">
            {item.isMuted ? "🔕" : "🔔"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="p-0">
      {/* Заголовок */}
      <View className="px-4 py-4 border-b" style={{ borderBottomColor: colors.border }}>
        <Text className="text-2xl font-bold text-foreground">Чаты</Text>
        <Text className="text-sm text-muted mt-1">
          {chats.length} чатов • {chats.filter((c) => !c.isMuted).length} с уведомлениями
        </Text>
      </View>

      {/* Список чатов */}
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ flexGrow: 1 }}
      />

      {/* Информация */}
      <View className="px-4 py-3 border-t" style={{ borderTopColor: colors.border }}>
        <Text className="text-xs text-muted text-center">
          💡 Нажмите на чат для открытия • Нажмите 🔔 для управления уведомлениями
        </Text>
      </View>
    </ScreenContainer>
  );
}
