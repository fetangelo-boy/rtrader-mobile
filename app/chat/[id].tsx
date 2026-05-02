import { View, Text, FlatList, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Platform, Keyboard } from "react-native";

interface Message {
  id: string;
  user_id: string;
  author: string;
  content: string;
  created_at: string;
  reply_to_message_id?: string;
  replyTo?: {
    author: string;
    content: string;
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
  const inputRef = useRef<TextInput>(null);

  // Fetch chat info for header
  const { data: chatInfo } = trpc.chat.getChatInfo.useQuery({ chatId: Number(chatId) });

  // Fetch chat messages via tRPC
  const { data: messagesData, isLoading: messagesLoading, error: messagesError } = trpc.chat.getMessages.useQuery({
    chatId: Number(chatId),
    limit: 50,
    offset: 0,
  });

  // Debug logging
  useEffect(() => {
    console.log("[ChatDetail] chatId:", chatId);
    console.log("[ChatDetail] messagesData:", messagesData);
    console.log("[ChatDetail] messagesLoading:", messagesLoading);
    console.log("[ChatDetail] messagesError:", messagesError);
  }, [messagesData, messagesLoading, messagesError, chatId]);

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (sentMessage: any) => {
      const profile = sentMessage.profiles;
      const author = (profile?.username && String(profile.username).trim()) ? String(profile.username).trim() : "Вы";
      const newMsg: Message = {
        id: sentMessage.id,
        user_id: sentMessage.user_id,
        author: author,
        content: sentMessage.content,
        created_at: sentMessage.created_at,
        reply_to_message_id: sentMessage.reply_to_message_id,
        replyTo: replyingTo ? {
          author: replyingTo.author,
          content: replyingTo.content,
        } : undefined,
        isOwn: true,
      };
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
      setReplyingTo(null);
      // Dismiss keyboard so user sees their sent message
      Keyboard.dismiss();
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      Alert.alert("Ошибка", "Не удалось отправить сообщение");
    },
  });

  useEffect(() => {
    if (messagesData) {
      const formattedMessages: Message[] = messagesData.map((msg: any) => {
        // Server returns author as { id, name, email } from MySQL users table
        const authorName = (msg.author?.name && String(msg.author.name).trim())
          ? String(msg.author.name).trim()
          : "Пользователь";

        return {
          id: String(msg.id),
          user_id: String(msg.userId),
          author: authorName,
          content: msg.content,
          created_at: msg.createdAt,
          reply_to_message_id: msg.replyToId ? String(msg.replyToId) : undefined,
          isOwn: false,
        };
      });
      setMessages(formattedMessages);
      setLoading(false);
    }
  }, [messagesData]);

  const handleSendMessage = () => {
    console.log("[Chat] handleSendMessage called");
    console.log("[Chat] newMessage:", newMessage);
    console.log("[Chat] chatId:", chatId);
    if (!newMessage.trim()) {
      console.log("[Chat] Message is empty, skipping");
      return;
    }

    console.log("[Chat] Sending message...");
    sendMessageMutation.mutate({
      chatId: Number(chatId),
      content: newMessage.trim(),
      replyToId: replyingTo?.id ? Number(replyingTo.id) : undefined,
    });
    
    // Keyboard will be dismissed in onSuccess callback
  };

  const handleKeyPress = (e: any) => {
    // On Android, send message on Enter key (without Shift)
    if (Platform.OS === "android" && e.nativeEvent.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <Pressable
      onLongPress={() => handleReply(item)}
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
              {item.replyTo.content}
            </Text>
          </View>
        )}

        {/* Сообщение */}
        <View
          className={cn(
            "rounded-lg px-3 py-2 max-w-xs",
            item.isOwn ? "bg-primary" : "bg-surface"
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
            {item.content}
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
        className="px-4 py-3 border-b flex-row items-center"
        style={{ borderBottomColor: colors.border }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8, marginLeft: -8 }]}
        >
          <Text className="text-2xl text-foreground">←</Text>
        </Pressable>
        <View className="flex-1 ml-2">
          <Text className="text-lg font-bold text-foreground">{chatInfo?.name || `Чат ${chatId}`}</Text>
          <Text className="text-xs text-muted">
            {messages.length} сообщений
          </Text>
        </View>
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
          style={{ borderBottomColor: colors.border, backgroundColor: colors.surface }}
        >
          <View className="flex-1">
            <Text className="text-xs text-muted">Ответ на {replyingTo.author}</Text>
            <Text className="text-sm text-foreground" numberOfLines={1}>
              {replyingTo.content}
            </Text>
          </View>
          <Pressable
            onPress={() => setReplyingTo(null)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
          >
            <Text className="text-lg text-foreground">✕</Text>
          </Pressable>
        </View>
      )}

      {/* Input для сообщения - скрыт для обычных пользователей в info_only чатах */}
      {chatInfo?.chatType === "info_only" && chatInfo?.userRole !== "admin" ? (
        <View
          className="px-4 py-3 border-t items-center justify-center"
          style={{ borderTopColor: colors.border, backgroundColor: colors.surface }}
        >
          <Text className="text-sm text-muted">📖 Это информационный канал (только для чтения)</Text>
        </View>
      ) : (
        <View
          className="px-4 py-3 border-t flex-row items-center gap-2"
          style={{ borderTopColor: colors.border }}
        >
          <TextInput
            ref={inputRef}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Введите сообщение..."
            placeholderTextColor={colors.muted}
            className="flex-1 px-3 py-2 rounded-lg text-foreground"
            style={{ backgroundColor: colors.surface, maxHeight: 100 }}
            multiline={true}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            onKeyPress={handleKeyPress}
            blurOnSubmit={false}
            editable={!sendMessageMutation.isPending}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            style={({ pressed }) => [{ opacity: (!newMessage.trim() || sendMessageMutation.isPending) ? 0.3 : pressed ? 0.7 : 1, padding: 8 }]}
          >
            <Text className="text-xl">
              {sendMessageMutation.isPending ? "⏳" : "✈️"}
            </Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}
