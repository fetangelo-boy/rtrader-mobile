import { router, supabaseProtectedProcedure } from "../_core/trpc";
import { getServerSupabase } from "../../lib/supabase";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

/**
 * Chat router — fully migrated to Supabase PostgreSQL.
 * No MySQL dependency. Uses service role key for server-side operations.
 */
export const chatRouter = router({
  /**
   * Get list of chats for current user
   * Returns chats where user is a participant, with last message info
   */
  list: supabaseProtectedProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.supabaseUser?.id as string;
    if (!userId) throw new Error("Unauthorized");

    const supabase = getServerSupabase();

    // Get all chats where user is a participant
    const { data: participations, error: partError } = await supabase
      .from("chat_participants")
      .select("chat_id, role")
      .eq("user_id", userId);

    if (partError) throw new Error(`Failed to get participations: ${partError.message}`);
    if (!participations || participations.length === 0) return [];

    const chatIds = participations.map((p: any) => p.chat_id);
    const roleMap: Record<string, string> = {};
    for (const p of participations) roleMap[p.chat_id] = p.role;

    // Get chats
    const { data: chatList, error: chatError } = await supabase
      .from("chats")
      .select("id, name, description, type, created_at, updated_at")
      .in("id", chatIds)
      .order("created_at", { ascending: false });

    if (chatError) throw new Error(`Failed to get chats: ${chatError.message}`);
    if (!chatList) return [];

    // Enrich with last message
    const enriched = await Promise.all(
      chatList.map(async (chat: any) => {
        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("id, content, created_at, user_id, media_type, media_url")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          id: chat.id,
          name: chat.name,
          description: chat.description,
          chatType: chat.type,
          icon: null,
          sortOrder: 0,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
          userRole: roleMap[chat.id] || "participant",
          lastMessage: lastMsgs?.[0] || null,
        };
      })
    );

    return enriched;
  }),

  /**
   * Get info for a single chat with user's role
   */
  getChatInfo: supabaseProtectedProcedure
    .input(z.object({ chatId: z.union([z.number(), z.string()]) }))
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id as string;
      if (!userId) throw new Error("Unauthorized");

      const supabase = getServerSupabase();
      const chatId = String(input.chatId);

      const { data: chat, error: chatError } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();

      if (chatError || !chat) throw new Error("Chat not found");

      const { data: participant, error: partError } = await supabase
        .from("chat_participants")
        .select("role")
        .eq("chat_id", chatId)
        .eq("user_id", userId)
        .single();

      if (partError || !participant) throw new Error("Not a participant");

      return {
        id: chat.id,
        name: chat.name,
        description: chat.description,
        chatType: chat.type,
        icon: null,
        sortOrder: 0,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        userRole: participant.role,
        isMuted: false,
      };
    }),

  /**
   * Get messages for a specific chat with pagination
   */
  getMessages: supabaseProtectedProcedure
    .input(
      z.object({
        chatId: z.union([z.number(), z.string()]),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id as string;
      if (!userId) throw new Error("Unauthorized");

      const supabase = getServerSupabase();
      const chatId = String(input.chatId);

      // Verify user is a participant
      const { data: participant } = await supabase
        .from("chat_participants")
        .select("role")
        .eq("chat_id", chatId)
        .eq("user_id", userId)
        .single();

      if (!participant) throw new Error("Not a participant");

      // Get messages with author profile
      const { data: msgList, error } = await supabase
        .from("messages")
        .select(`
          id,
          chat_id,
          user_id,
          content,
          media_url,
          media_type,
          file_id,
          reply_to_message_id,
          tg_msg_id,
          created_at,
          updated_at,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw new Error(`Failed to get messages: ${error.message}`);

      // Return in chronological order with normalized shape
      return (msgList || []).reverse().map((m: any) => ({
        id: m.id,
        chatId: m.chat_id,
        userId: m.user_id,
        content: m.content,
        mediaUrl: m.media_url,
        mediaType: m.media_type,
        fileId: m.file_id,
        replyToId: m.reply_to_message_id,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        author: m.profiles
          ? {
              id: m.profiles.id,
              name: m.profiles.username || "Пользователь",
              email: null,
            }
          : { id: m.user_id, name: "Пользователь", email: null },
      }));
    }),

  /**
   * Send a message to a chat
   */
  sendMessage: supabaseProtectedProcedure
    .input(
      z.object({
        chatId: z.union([z.number(), z.string()]),
        content: z.string().min(1),
        replyToId: z.string().optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(["image", "video", "file"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id as string;
      if (!userId) throw new Error("Unauthorized");

      const supabase = getServerSupabase();
      const chatId = String(input.chatId);

      // Verify user is participant
      const { data: participant } = await supabase
        .from("chat_participants")
        .select("role")
        .eq("chat_id", chatId)
        .eq("user_id", userId)
        .single();

      if (!participant) throw new Error("Not a participant");

      // Get chat info
      const { data: chat } = await supabase
        .from("chats")
        .select("type")
        .eq("id", chatId)
        .single();

      if (!chat) throw new Error("Chat not found");

      // Enforce info_only restrictions
      if (chat.type === "info_only" && participant.role !== "admin") {
        throw new Error("Only admins can post in info_only chats");
      }

      // Map media type
      const pgMediaType = input.mediaType === "image" ? "photo"
        : input.mediaType === "video" ? "video"
        : input.mediaType === "file" ? "document"
        : null;

      const messageId = uuidv4();
      const { data: newMessage, error } = await supabase
        .from("messages")
        .insert({
          id: messageId,
          chat_id: chatId,
          user_id: userId,
          content: input.content,
          media_url: input.mediaUrl || null,
          media_type: pgMediaType,
          reply_to_message_id: input.replyToId || null,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to send message: ${error.message}`);

      return {
        id: newMessage.id,
        chatId: newMessage.chat_id,
        userId: newMessage.user_id,
        content: newMessage.content,
        mediaUrl: newMessage.media_url,
        mediaType: newMessage.media_type,
        createdAt: newMessage.created_at,
        updatedAt: newMessage.updated_at,
      };
    }),

  /**
   * Mute/unmute notifications for a chat
   */
  setMuted: supabaseProtectedProcedure
    .input(z.object({ chatId: z.union([z.number(), z.string()]), isMuted: z.boolean() }))
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id as string;
      if (!userId) throw new Error("Unauthorized");

      const supabase = getServerSupabase();
      const chatId = String(input.chatId);

      // Upsert into chat_settings
      const { error } = await supabase
        .from("chat_settings")
        .upsert(
          { chat_id: chatId, user_id: userId, muted: input.isMuted },
          { onConflict: "chat_id,user_id" }
        );

      if (error) throw new Error(`Failed to update mute: ${error.message}`);

      return { success: true, isMuted: input.isMuted };
    }),
});
