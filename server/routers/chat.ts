import { router, publicProcedure } from "../_core/trpc";
import { supabase } from "../../lib/supabase";
import { z } from "zod";

export const chatRouter = router({
  // Get list of chats for current user
  list: publicProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.userId;
    if (!userId) throw new Error("Unauthorized");

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
  getMessages: publicProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.userId;
      if (!userId) throw new Error("Unauthorized");

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
          created_at,
          author_id,
          reply_to_message_id,
          profiles:author_id(username, avatar_url),
          reply_to:reply_to_message_id(text, author_id, profiles:author_id(username))
        `
        )
        .eq("chat_id", input.chatId)
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw error;
      return messages || [];
    }),

  // Send a message
  sendMessage: publicProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        text: z.string().min(1),
        replyToMessageId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.userId;
      if (!userId) throw new Error("Unauthorized");

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
          created_at,
          author_id,
          reply_to_message_id,
          profiles:author_id(username, avatar_url)
        `
        )
        .single();

      if (error) throw error;
      return message;
    }),

  // Get chat settings (mute status)
  getSettings: publicProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.userId;
      if (!userId) throw new Error("Unauthorized");

      const { data: settings, error } = await supabase
        .from("chat_settings")
        .select("muted, muted_until")
        .eq("chat_id", input.chatId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return settings || { muted: false, muted_until: null };
    }),

  // Set mute status for a chat
  setMute: publicProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        muted: z.boolean(),
        mutedUntil: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.userId;
      if (!userId) throw new Error("Unauthorized");

      const { data: settings, error: upsertError } = await supabase
        .from("chat_settings")
        .upsert({
          chat_id: input.chatId,
          user_id: userId,
          muted: input.muted,
          muted_until: input.mutedUntil || null,
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      return settings;
    }),
});
