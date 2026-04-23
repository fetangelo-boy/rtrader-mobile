import { View, Text, ScrollView, Pressable, FlatList, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface ChatItem {
  id: string;
  title: string;
  type: string; // 'interactive' | 'info_only'
  created_at: string;
  isMuted?: boolean;
  unreadCount?: number;
}

export default function ChatsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [muteStatus, setMuteStatus] = useState<Record<string, boolean>>({});

  // Fetch chats list with timeout
  const { data: chatsList, isLoading: chatsLoading, error: queryError } = trpc.chat.list.useQuery(undefined, {
    retry: 1,
    retryDelay: 1000,
  });

  // Debug logging
  useEffect(() => {
    console.log('[ChatsScreen] Query state:', { chatsLoading, queryError, hasData: !!chatsList });
    if (queryError) {
      console.error('[ChatsScreen] Query error:', queryError);
    }
  }, [chatsLoading, queryError, chatsList]);

  // Mute settings are loaded lazily - default to false (unmuted)

  useEffect(() => {
    if (queryError) {
      console.error('[ChatsScreen] Setting error state:', queryError);
      setError('Ошибка загрузки чатов. Проверьте интернет соединение.');
      setLoading(false);
      return;
    }
    
    if (chatsList) {
      console.log('[ChatsScreen] Formatting chats:', chatsList.length);
      const formattedChats: ChatItem[] = chatsList.map((chat: any) => ({
        id: chat.id,
        title: chat.name || chat.title || chat.id, // API returns 'name'
        type: chat.type || 'interactive', // API returns 'type'
        created_at: chat.created_at,
        isMuted: muteStatus[chat.id] || false,
        unreadCount: 0,
      }));
      console.log('[ChatsScreen] Chats loaded:', formattedChats.length);
      setChats(formattedChats);
      setLoading(false);
      setError(null);
    }
  }, [chatsList, muteStatus, queryError]);

  // Add timeout for loading state
  useEffect(() => {
    if (loading && chatsLoading) {
      console.log('[ChatsScreen] Starting timeout for chat loading...');
      const timeout = setTimeout(() => {
        if (chatsLoading) {
          console.error('[ChatsScreen] Chat loading timeout after 10 seconds');
          setError('Загрузка чатов занимает слишком долго. Попробуйте перезагрузить приложение.');
          setLoading(false);
        }
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeout);
    }
  }, [loading, chatsLoading]);

  // Log initial mount
  useEffect(() => {
    console.log('[ChatsScreen] Mounted');
  }, []);

  const handleChatPress = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const toggleMute = async (chatId: string, e: any) => {
    e.stopPropagation();
    const currentMuted = muteStatus[chatId] || false;
    // Optimistically update UI
    const newMuted = !currentMuted;
    setMuteStatus((prev) => ({ ...prev, [chatId]: newMuted }));
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, isMuted: newMuted } : chat
      )
    );
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
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
            item.type === 'interactive'
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
            {item.title}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {item.type === 'interactive' ? "Интерактивный" : "Инфо-канал"}
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

  if (error) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-error text-center mb-4">⚠️</Text>
        <Text className="text-foreground text-center font-semibold mb-2">Ошибка</Text>
        <Text className="text-muted text-center mb-6">{error}</Text>
        <Text className="text-xs text-muted text-center mb-4 px-4">Debug: {queryError?.message || 'Unknown error'}</Text>
        <Pressable
          onPress={() => {
            console.log('[ChatsScreen] User clicked retry');
            setError(null);
            setLoading(true);
            // Force refresh
            window.location.reload?.();
          }}
          style={{ backgroundColor: colors.primary }}
          className="px-6 py-3 rounded-lg"
        >
          <Text className="text-background font-semibold">Повторить</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  if (loading || chatsLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Загрузка чатов...</Text>
        <Text className="text-xs text-muted mt-2">Это может занять до 10 секунд</Text>
      </ScreenContainer>
    );
  }

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
      {chats.length > 0 ? (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted text-center">Нет доступных чатов</Text>
        </View>
      )}

      {/* Информация */}
      <View className="px-4 py-3 border-t" style={{ borderTopColor: colors.border }}>
        <Text className="text-xs text-muted text-center">
          💡 Нажмите на чат для открытия • Нажмите 🔔 для управления уведомлениями
        </Text>
      </View>
    </ScreenContainer>
  );
}
