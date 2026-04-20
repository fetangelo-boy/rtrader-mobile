import { router, protectedProcedure } from "../_core/trpc";
import { getServerSupabase } from "../../lib/supabase";
import { z } from "zod";

export const chatRouter = router({
  // Get list of chats for current user
  list: protectedProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.supabaseUser?.id;
    if (!userId) throw new Error("Unauthorized");
    const supabase = getServerSupabase();

    const { data: chats, error } = await supabase
      .from("chats")
      .select(
        `
        id,
        title,
        is_group,
        created_at,
        chat_participants(user_id),
        messages(id, created_at)
      `
      )
      .eq("chat_participants.user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return chats || [];
  }),

  // Get messages for a specific chat
  getMessages: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id;
      if (!userId) throw new Error("Unauthorized");
      const supabase = getServerSupabase();

      // Check if user is participant
      const { data: participant, error: participantError } = await supabase
        .from("chat_participants")
        .select("id")
        .eq("chat_id", input.chatId)
        .eq("user_id", userId)
        .single();

      if (participantError || !participant) {
        throw new Error("Not a participant of this chat");
      }

      // Get messages with author info
      const { data: messages, error } = await supabase
        .from("messages")
        .select(
          `
          id,
          text,
          author_id,
          created_at,
          reply_to_message_id,
          profiles!author_id(username, avatar_url),
          reply_to:messages!reply_to_message_id(
            id,
            text,
            author_id,
            profiles!author_id(username)
          )
        `
        )
        .eq("chat_id", input.chatId)
        .order("created_at", { ascending: true })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw error;
      return messages || [];
    }),

  // Send a message to a chat
  sendMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        text: z.string().min(1),
        replyToMessageId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id;
      if (!userId) throw new Error("Unauthorized");
      const supabase = getServerSupabase();

      // Check if user is participant
      const { data: participant, error: participantError } = await supabase
        .from("chat_participants")
        .select("id")
        .eq("chat_id", input.chatId)
        .eq("user_id", userId)
        .single();

      if (participantError || !participant) {
        throw new Error("Not a participant of this chat");
      }

      // Insert message
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          chat_id: input.chatId,
          author_id: userId,
          text: input.text,
          reply_to_message_id: input.replyToMessageId || null,
        })
        .select(
          `
          id,
          text,
          author_id,
          created_at,
          reply_to_message_id,
          profiles!author_id(username, avatar_url)
        `
        )
        .single();

      if (error) throw error;
      return message;
    }),

  // Get chat settings (mute status)
  getSettings: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id;
      if (!userId) throw new Error("Unauthorized");
      const supabase = getServerSupabase();

      const { data: settings, error } = await supabase
        .from("chat_settings")
        .select("*")
        .eq("chat_id", input.chatId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return settings || { is_muted: false };
    }),

  // Set mute status for a chat
  setMute: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        isMuted: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id;
      if (!userId) throw new Error("Unauthorized");
      const supabase = getServerSupabase();

      // Upsert chat settings
      const { data: settings, error } = await supabase
        .from("chat_settings")
        .upsert({
          chat_id: input.chatId,
          user_id: userId,
          is_muted: input.isMuted,
        })
        .select()
        .single();

      if (error) throw error;
      return settings;
    }),
});
