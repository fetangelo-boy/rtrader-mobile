import { View, Text, FlatList, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/lib/api-rest";
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

  const queryClient = useQueryClient();
  const chatIdStr = String(chatId);

  // Fetch chat info for header (derived from chats list — backend has no /api/chats/:id)
  const { data: chatInfo } = useQuery({
    queryKey: ["chat", "info", chatIdStr],
    queryFn: () => chatApi.getInfo(chatIdStr),
    enabled: !!chatIdStr,
  });

  // Fetch chat messages via REST
  const { data: messagesData, isLoading: messagesLoading, error: messagesError } = useQuery({
    queryKey: ["chat", "messages", chatIdStr],
    queryFn: () => chatApi.getMessages(chatIdStr, 50, 0),
    enabled: !!chatIdStr,
  });

  // Debug logging
  useEffect(() => {
    console.log("[ChatDetail] chatId:", chatId);
    console.log("[ChatDetail] messagesData:", messagesData);
    console.log("[ChatDetail] messagesLoading:", messagesLoading);
    console.log("[ChatDetail] messagesError:", messagesError);
  }, [messagesData, messagesLoading, messagesError, chatId]);

  // Send message mutation (REST)
  const sendMessageMutation = useMutation({
    mutationFn: (input: { content: string; replyToId?: string }) =>
      chatApi.sendMessage(chatIdStr, input),
    onSuccess: (sentMessage: any) => {
      const profile = sentMessage?.profiles || sentMessage?.author;
      const author = (profile?.username && String(profile.username).trim())
        ? String(profile.username).trim()
        : (profile?.name && String(profile.name).trim())
          ? String(profile.name).trim()
          : "Вы";
      const newMsg: Message = {
        id: String(sentMessage.id),
        user_id: String(sentMessage.user_id || sentMessage.userId || ""),
        author: author,
        content: sentMessage.content,
        created_at: sentMessage.created_at || sentMessage.createdAt,
        reply_to_message_id: sentMessage.reply_to_message_id || sentMessage.replyToId || undefined,
        replyTo: replyingTo ? {
          author: replyingTo.author,
          content: replyingTo.content,
        } : undefined,
        isOwn: true,
      };
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
      setReplyingTo(null);
      Keyboard.dismiss();
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", chatIdStr] });
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      Alert.alert("Ошибка", "Не удалось отправить сообщение");
    },
  });

  useEffect(() => {
    if (messagesData) {
      const formattedMessages: Message[] = messagesData.map((msg: any) => {
        // REST shape: author is `{ id, name, email }` or legacy `profiles.username`
        const profile = msg.author || msg.profiles;
        const author = (profile?.username && String(profile.username).trim())
          ? String(profile.username).trim()
          : (profile?.name && String(profile.name).trim())
            ? String(profile.name).trim()
            : "Пользователь";

        const replyToMsg = msg.reply_to_msg && typeof msg.reply_to_msg === 'object' && !Array.isArray(msg.reply_to_msg)
          ? msg.reply_to_msg
          : null;

        return {
          id: String(msg.id),
          user_id: String(msg.user_id || msg.userId || ""),
          author: author,
          content: msg.content,
          created_at: msg.created_at || msg.createdAt,
          reply_to_message_id: msg.reply_to_message_id || msg.replyToId || undefined,
          replyTo: replyToMsg ? {
            author: (() => {
              const rp = replyToMsg.author || replyToMsg.profiles;
              if (rp?.username && String(rp.username).trim()) return String(rp.username).trim();
              if (rp?.name && String(rp.name).trim()) return String(rp.name).trim();
              return "Пользователь";
            })(),
            content: replyToMsg.content,
          } : undefined,
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
      content: newMessage.trim(),
      replyToId: replyingTo?.id ? String(replyingTo.id) : undefined,
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
