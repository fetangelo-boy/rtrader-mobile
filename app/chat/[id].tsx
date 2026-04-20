import { View, Text, FlatList, Pressable, TextInput, Alert, ActivityIndicator, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface Message {
  id: string;
  author_id: string;
  author: string;
  text: string;
  created_at: string;
  reply_to_message_id?: string;
  replyTo?: {
    author: string;
    text: string;
  };
  isOwn?: boolean;
}

export default function ChatDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id: chatId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<FlatList>(null);

  // Fetch chat messages
  const { data: messagesData, isLoading: messagesLoading } = trpc.chat.getMessages.useQuery({
    chatId: chatId as string,
    limit: 50,
    offset: 0,
  });

  useEffect(() => {
    if (messagesData) {
      const formattedMessages: Message[] = messagesData.map((msg: any) => {
        const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
        return {
        id: msg.id,
        author_id: msg.author_id,
        author: profile?.username || "Unknown",
        text: msg.text,
        created_at: msg.created_at,
        reply_to_message_id: msg.reply_to_message_id,
        replyTo: msg.reply_to ? {
          author: msg.reply_to.profiles?.username || "Unknown",
          text: msg.reply_to.text,
        } : undefined,
        isOwn: false, // TODO: check if current user
      };
      });
      setMessages(formattedMessages);
      setLoading(false);
    }
  }, [messagesData]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const client = trpc.createClient({} as any);
      const sentMessage = await client.chat.sendMessage.mutate({
        chatId: chatId as string,
        text: newMessage,
        replyToMessageId: replyingTo?.id,
      });

      if (sentMessage) {
        const profile = Array.isArray(sentMessage.profiles) ? sentMessage.profiles[0] : sentMessage.profiles;
      const newMsg: Message = {
          id: sentMessage.id,
          author_id: sentMessage.author_id,
          author: profile?.username || "You",
          text: sentMessage.text,
          created_at: sentMessage.created_at,
          reply_to_message_id: sentMessage.reply_to_message_id,
          replyTo: replyingTo ? {
            author: replyingTo.author,
            text: replyingTo.text,
          } : undefined,
          isOwn: true,
        };

        setMessages([...messages, newMsg]);
        setNewMessage("");
        setReplyingTo(null);

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Ошибка", "Не удалось отправить сообщение");
    }
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
            {new Date(item.created_at).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  if (loading || messagesLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Загрузка сообщений...</Text>
      </ScreenContainer>
    );
  }

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
          <Text className="text-lg font-bold text-foreground">Чат</Text>
          <Text className="text-xs text-muted">
            {messages.length} сообщений
          </Text>
        </View>
        <Pressable className="p-2">
          <Text className="text-lg">ℹ️</Text>
        </Pressable>
      </View>

      {/* Сообщения */}
      {messages.length > 0 ? (
        <FlatList
          ref={scrollViewRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Нет сообщений</Text>
        </View>
      )}

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
      <View
        className="px-4 py-3 border-t flex-row items-center gap-2"
        style={{ borderTopColor: colors.border }}
      >
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
    </ScreenContainer>
  );
}
