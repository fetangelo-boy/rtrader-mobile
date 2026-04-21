import { View, Text, FlatList, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  // Fetch chat info for header
  const { data: chatInfo } = trpc.chat.getChatInfo.useQuery({ chatId: chatId as string });

  // Fetch chat messages via tRPC
  const { data: messagesData, isLoading: messagesLoading } = trpc.chat.getMessages.useQuery({
    chatId: chatId as string,
    limit: 50,
    offset: 0,
  });

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (sentMessage: any) => {
      const profile = Array.isArray(sentMessage.profiles) ? sentMessage.profiles[0] : sentMessage.profiles;
      const newMsg: Message = {
        id: sentMessage.id,
        user_id: sentMessage.user_id,
        author: profile?.username || "Вы",
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
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      Alert.alert("Ошибка", "Не удалось отправить сообщение");
    },
  });

  useEffect(() => {
    if (messagesData) {
      const formattedMessages: Message[] = messagesData.map((msg: any) => {
        const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
        // Use username if it exists and is not empty, otherwise use fallback
        const author = (profile?.username && profile.username.trim()) ? profile.username : "Пользователь";
        return {
          id: msg.id,
          user_id: msg.user_id,
          author: author,
          content: msg.content, // API returns 'content', not 'text'
          created_at: msg.created_at,
          reply_to_message_id: msg.reply_to_message_id,
          replyTo: msg.reply_to ? {
            author: (() => {
           const rp = Array.isArray(msg.reply_to.profiles) ? msg.reply_to.profiles[0] : msg.reply_to.profiles;
              return (rp?.username && rp.username.trim()) ? rp.username : "Пользователь";           })(),
            content: msg.reply_to.content,
          } : undefined,
          isOwn: false, // TODO: compare with current user ID from session
        };
      });
      setMessages(formattedMessages);
      setLoading(false);
    }
  }, [messagesData]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({
      chatId: chatId as string,
      content: newMessage.trim(),
      replyToMessageId: replyingTo?.id,
    });
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

  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      style={{ flex: 1 }}
    >
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
          returnKeyType="send"
          onSubmitEditing={handleSendMessage}
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
    </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
