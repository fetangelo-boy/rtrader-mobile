import { View, Text, ScrollView, Pressable, TextInput, FlatList, Image, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  replyTo?: {
    author: string;
    text: string;
  };
  image?: string;
  isOwn?: boolean;
}

interface ChatInfo {
  id: string;
  name: string;
  type: "interactive" | "informational";
}

const CHAT_NAMES: Record<string, ChatInfo> = {
  "1": { id: "1", name: "Газ / нефть", type: "interactive" },
  "2": { id: "2", name: "Продуктовый", type: "interactive" },
  "3": { id: "3", name: "Металлы", type: "interactive" },
  "4": { id: "4", name: "Чат", type: "interactive" },
  "5": { id: "5", name: "Технические вопросы", type: "interactive" },
  "6": { id: "6", name: "Прихожая", type: "informational" },
  "7": { id: "7", name: "Интрадей и мысли", type: "informational" },
  "8": { id: "8", name: "Видео-разборы", type: "informational" },
};

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    author: "Иван Трейдер",
    text: "Привет всем! Как дела на рынке?",
    timestamp: "10:30",
  },
  {
    id: "2",
    author: "Мария Аналитик",
    text: "Рынок в боковике, ждём пробоя",
    timestamp: "10:35",
    replyTo: { author: "Иван Трейдер", text: "Привет всем! Как дела на рынке?" },
  },
  {
    id: "3",
    author: "Вы",
    text: "Согласен, уровень 150 - ключевой",
    timestamp: "10:40",
    isOwn: true,
  },
];

export default function ChatDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const chatInfo = CHAT_NAMES[id as string];
  const isInteractive = chatInfo?.type === "interactive";

  if (!chatInfo) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-foreground">Чат не найден</Text>
      </ScreenContainer>
    );
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: String(messages.length + 1),
      author: "Вы",
      text: newMessage,
      timestamp: new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      replyTo: replyingTo ? { author: replyingTo.author, text: replyingTo.text } : undefined,
      isOwn: true,
    };

    setMessages([...messages, message]);
    setNewMessage("");
    setReplyingTo(null);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleAttachPhoto = () => {
    Alert.alert("Загрузка фото", "Функция загрузки фото будет реализована");
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <Pressable
      onLongPress={() => !item.isOwn && handleReply(item)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View className={cn("px-4 py-2", item.isOwn && "items-end")}>
        {/* Reply цитата */}
        {item.replyTo && (
          <View
            className="mb-2 px-3 py-2 rounded-lg border-l-2"
            style={{
              backgroundColor: colors.surface,
              borderLeftColor: colors.primary,
            }}
          >
            <Text className="text-xs text-muted">{item.replyTo.author}</Text>
            <Text className="text-sm text-foreground" numberOfLines={2}>
              {item.replyTo.text}
            </Text>
          </View>
        )}

        {/* Сообщение */}
        <View
          className={cn(
            "rounded-lg px-3 py-2 max-w-xs",
            item.isOwn
              ? "bg-primary"
              : "bg-surface"
          )}
        >
          {!item.isOwn && (
            <Text className="text-xs font-semibold text-muted mb-1">
              {item.author}
            </Text>
          )}
          <Text className={cn(
            "text-sm",
            item.isOwn ? "text-background" : "text-foreground"
          )}>
            {item.text}
          </Text>
          <Text className={cn(
            "text-xs mt-1",
            item.isOwn ? "text-background opacity-70" : "text-muted"
          )}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="p-0 flex-1">
      {/* Заголовок */}
      <View
        className="px-4 py-3 border-b flex-row items-center justify-between"
        style={{ borderBottomColor: colors.border }}
      >
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <Text className="text-2xl">←</Text>
        </Pressable>
        <View className="flex-1 ml-2">
          <Text className="text-lg font-bold text-foreground">{chatInfo.name}</Text>
          <Text className="text-xs text-muted">
            {isInteractive ? "Интерактивный" : "Информационный"}
          </Text>
        </View>
        <Pressable className="p-2">
          <Text className="text-lg">ℹ️</Text>
        </Pressable>
      </View>

      {/* Сообщения */}
      <FlatList
        ref={scrollViewRef as any}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Reply цитата */}
      {replyingTo && (
        <View
          className="px-4 py-2 border-b flex-row items-center justify-between"
          style={{ borderBottomColor: colors.border }}
        >
          <View className="flex-1">
            <Text className="text-xs text-muted">Ответ на {replyingTo.author}</Text>
            <Text className="text-sm text-foreground" numberOfLines={1}>
              {replyingTo.text}
            </Text>
          </View>
          <Pressable onPress={() => setReplyingTo(null)} className="p-2">
            <Text className="text-lg">✕</Text>
          </Pressable>
        </View>
      )}

      {/* Input для сообщения */}
      {isInteractive ? (
        <View
          className="px-4 py-3 border-t flex-row items-center gap-2"
          style={{ borderTopColor: colors.border }}
        >
          <Pressable onPress={handleAttachPhoto} className="p-2">
            <Text className="text-xl">📷</Text>
          </Pressable>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Введите сообщение..."
            placeholderTextColor={colors.muted}
            className="flex-1 px-3 py-2 rounded-lg text-foreground"
            style={{ backgroundColor: colors.surface, maxHeight: 100 }}
            multiline
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-2"
          >
            <Text className={cn(
              "text-xl",
              newMessage.trim() ? "opacity-100" : "opacity-30"
            )}>
              ✈️
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          className="px-4 py-3 border-t items-center"
          style={{ borderTopColor: colors.border }}
        >
          <Text className="text-sm text-muted">
            📖 Это информационный чат. Писать сообщения нельзя.
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}
