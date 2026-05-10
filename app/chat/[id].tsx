import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase-client";
import { v4 as uuidv4 } from "uuid";

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
  media_type?: "photo" | "video" | "document" | null;
  media_url?: string | null;
  file_id?: string | null;
}

function safeFormatTime(value: any): string {
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id: chatId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollViewRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const { data: chatInfo } = trpc.chat.getChatInfo.useQuery({ chatId: String(chatId) });

  const utils = trpc.useUtils();

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
  } = trpc.chat.getMessages.useQuery(
    {
      chatId: String(chatId),
      limit: 50,
      offset: 0,
    },
    {
      // No polling — Supabase Realtime handles live updates
      refetchInterval: false,
    }
  );

  // Supabase Realtime: subscribe to new messages in this chat
  useEffect(() => {
    const supabaseChatId = `chat-${chatId}`;
    const channel = supabase
      .channel(`messages:${supabaseChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${supabaseChatId}`,
        },
        (payload) => {
          const row = payload.new as any;
          // Refetch from tRPC to get author info
          utils.chat.getMessages.invalidate({ chatId: String(chatId) });
          // Optimistically append if it's not from the current user
          // (own messages are already appended in sendMessageMutation.onSuccess)
          const newMsg: Message = {
            id: String(row.id),
            user_id: String(row.user_id),
            author: row.user_id,
            content: row.content || "",
            created_at: row.created_at || new Date().toISOString(),
            media_type: row.media_type || null,
            media_url: row.media_url || null,
            file_id: row.file_id || null,
            isOwn: false,
          };
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (sentMessage: any) => {
      const newMsg: Message = {
        id: String(sentMessage.id),
        user_id: String(sentMessage.userId || sentMessage.user_id || ""),
        author: "Вы",
        content: sentMessage.content,
        created_at: sentMessage.createdAt
          ? (sentMessage.createdAt instanceof Date
              ? sentMessage.createdAt.toISOString()
              : String(sentMessage.createdAt))
          : new Date().toISOString(),
        reply_to_message_id: sentMessage.replyToId ? String(sentMessage.replyToId) : undefined,
        replyTo: replyingTo
          ? { author: replyingTo.author, content: replyingTo.content }
          : undefined,
        isOwn: true,
        media_type: sentMessage.mediaType || null,
        media_url: sentMessage.mediaUrl || null,
      };
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
      setReplyingTo(null);
      setSelectedImage(null);
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
        const authorName =
          msg.author?.name && String(msg.author.name).trim()
            ? String(msg.author.name).trim()
            : msg.author?.email
            ? String(msg.author.email).split("@")[0]
            : "Пользователь";

        const createdAtStr =
          msg.createdAt instanceof Date
            ? msg.createdAt.toISOString()
            : msg.createdAt
            ? String(msg.createdAt)
            : "";

        return {
          id: String(msg.id),
          user_id: String(msg.userId),
          author: authorName,
          content: msg.content,
          created_at: createdAtStr,
          reply_to_message_id: msg.replyToId ? String(msg.replyToId) : undefined,
          isOwn: false,
          media_type: (msg.mediaType as any) || null,
          media_url: (msg as any).mediaUrl || null,
          file_id: null,
        };
      });
      setMessages(formattedMessages);
      setLoading(false);
    }
  }, [messagesData]);

  useEffect(() => {
    if (messagesError) {
      console.error("[ChatDetail] messagesError:", messagesError);
      setLoading(false);
    }
  }, [messagesError]);

  const handleSendMessage = async () => {
    // If image is selected, upload it first
    if (selectedImage) {
      const mediaUrl = await uploadImageToSupabase(selectedImage);
      if (!mediaUrl) return;

      sendMessageMutation.mutate({
        chatId: String(chatId),
        content: newMessage.trim() || "📷 фото",
        replyToId: replyingTo?.id ? String(replyingTo.id) : undefined,
        mediaUrl: mediaUrl,
        mediaType: "image",
      });

      setSelectedImage(null);
    } else {
      sendMessageMutation.mutate({
        chatId: String(chatId),
        content: newMessage.trim(),
        replyToId: replyingTo?.id ? String(replyingTo.id) : undefined,
      });
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Ошибка", "Не удалось выбрать изображение");
    }
  };

  const uploadImageToSupabase = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    try {
      setUploadingImage(true);

      // Generate unique filename
      const fileExt = asset.uri.split('.').pop() || 'jpg';
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `chats/${chatId}/${fileName}`;

      // Fetch image blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // Try to upload to receipts bucket (fallback: use same bucket for all uploads)
      const bucketName = 'receipts';
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Ошибка", "Не удалось загрузить изображение. Проверьте интернет соединение.");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <Pressable
      onLongPress={() => handleReply(item)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View className={cn("px-4 py-2", item.isOwn && "items-end")}>
        {item.replyTo && (
          <View
            className="mb-2 px-3 py-2 rounded-lg border-l-2"
            style={{ backgroundColor: colors.surface, borderLeftColor: colors.primary }}
          >
            <Text className="text-xs text-muted">{item.replyTo.author}</Text>
            <Text className="text-sm text-foreground" numberOfLines={2}>
              {item.replyTo.content}
            </Text>
          </View>
        )}
        <View
          className={cn(
            "rounded-lg px-3 py-2 max-w-xs",
            item.isOwn ? "bg-primary" : "bg-surface"
          )}
        >
          {!item.isOwn && (
            <Text className="text-xs font-semibold text-muted mb-1">{item.author}</Text>
          )}
          {/* Media: photo */}
          {item.media_type === "photo" && item.media_url ? (
            <Image
              source={{ uri: item.media_url }}
              style={{ width: 220, height: 160, borderRadius: 8, marginBottom: 4 }}
              resizeMode="cover"
            />
          ) : null}
          {/* Media: video placeholder (file_id resolved via media-proxy) */}
          {item.media_type === "video" ? (
            <View
              style={{
                width: 220,
                height: 120,
                borderRadius: 8,
                marginBottom: 4,
                backgroundColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 32 }}>▶️</Text>
              <Text className="text-xs text-muted mt-1">Видео</Text>
            </View>
          ) : null}
          {/* Text content */}
          {item.content ? (
            <Text className={cn("text-sm", item.isOwn ? "text-background" : "text-foreground")}>
              {item.content}
            </Text>
          ) : null}
          {safeFormatTime(item.created_at) ? (
            <Text
              className={cn(
                "text-xs mt-1",
                item.isOwn ? "text-background opacity-70" : "text-muted"
              )}
            >
              {safeFormatTime(item.created_at)}
            </Text>
          ) : null}
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
          <Text className="text-lg font-bold text-foreground">
            {chatInfo?.name || `Чат ${chatId}`}
          </Text>
          <Text className="text-xs text-muted">{messages.length} сообщений</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {messages.length > 0 ? (
          <FlatList
            ref={scrollViewRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            style={{ flex: 1 }}
            keyboardDismissMode="on-drag"
            scrollEnabled={true}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted">Нет сообщений</Text>
          </View>
        )}

        {selectedImage && (
          <View
            className="px-4 py-2 border-b flex-row items-center justify-between"
            style={{ borderBottomColor: colors.border, backgroundColor: colors.surface }}
          >
            <View className="flex-1 flex-row items-center gap-2">
              <Image
                source={{ uri: selectedImage.uri }}
                style={{ width: 40, height: 40, borderRadius: 4 }}
                resizeMode="cover"
              />
              <View className="flex-1">
                <Text className="text-xs text-muted">Выбранное фото</Text>
                <Text className="text-sm text-foreground" numberOfLines={1}>
                  {selectedImage.fileName || "Изображение"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setSelectedImage(null)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
            >
              <Text className="text-lg text-foreground">✕</Text>
            </Pressable>
          </View>
        )}

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

        {chatInfo?.chatType === "info_only" && chatInfo?.userRole !== "admin" ? (
          <View
            className="px-4 py-3 border-t items-center justify-center"
            style={{ borderTopColor: colors.border, backgroundColor: colors.surface }}
          >
            <Text className="text-sm text-muted">
              📖 Это информационный канал (только для чтения)
            </Text>
          </View>
        ) : (
          <View
            className="px-4 py-3 border-t flex-row items-center gap-2"
            style={{ borderTopColor: colors.border }}
          >
            <Pressable
              onPress={handlePickImage}
              disabled={uploadingImage || sendMessageMutation.isPending}
              style={({ pressed }) => [
                {
                  opacity: uploadingImage || sendMessageMutation.isPending ? 0.3 : pressed ? 0.7 : 1,
                  padding: 8,
                },
              ]}
            >
              <Text className="text-xl">
                {uploadingImage ? "⏳" : "📷"}
              </Text>
            </Pressable>
            <TextInput
              ref={inputRef}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Введите сообщение..."
              placeholderTextColor={colors.muted}
              className="flex-1 px-3 py-2 rounded-lg text-foreground"
              style={{ backgroundColor: colors.surface, maxHeight: 100, minHeight: 40 }}
              multiline={true}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (newMessage.trim() || selectedImage) {
                  handleSendMessage();
                }
              }}
              blurOnSubmit={true}
              editable={!sendMessageMutation.isPending && !uploadingImage}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={(!newMessage.trim() && !selectedImage) || sendMessageMutation.isPending || uploadingImage}
              style={({ pressed }) => [
                {
                  opacity:
                    (!newMessage.trim() && !selectedImage) || sendMessageMutation.isPending || uploadingImage
                      ? 0.3
                      : pressed
                      ? 0.7
                      : 1,
                  padding: 8,
                },
              ]}
            >
              <Text className="text-xl">
                {sendMessageMutation.isPending || uploadingImage ? "⏳" : "✈️"}
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
