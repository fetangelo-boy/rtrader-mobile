import { router, protectedProcedure, supabaseProtectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { chats, messages, chatParticipants, users, pushTokens } from "../../drizzle/schema";
import { eq, and, desc, ne, inArray } from "drizzle-orm";
import { z } from "zod";

export const chatRouter = router({
  /**
   * Get list of chats for current user
   * Returns chats where user is a participant, with last message info
   */
  list: supabaseProtectedProcedure.query(async ({ ctx }: any) => {
    const supabaseUuid = ctx.supabaseUser?.id;
    if (!supabaseUuid) throw new Error("Unauthorized");

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Resolve MySQL user ID from Supabase UUID (stored in openId column)
    const [mysqlUser] = await db.select({ id: users.id }).from(users).where(eq(users.openId, supabaseUuid)).limit(1);
    if (!mysqlUser) throw new Error("Please login (10001)");
    const userId = String(mysqlUser.id);

    // Get all chats where user is a participant
    const userChats = await db
      .select({
        id: chats.id,
        name: chats.name,
        description: chats.description,
        chatType: chats.chatType,
        icon: chats.icon,
        sortOrder: chats.sortOrder,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
      })
      .from(chats)
      .innerJoin(chatParticipants, eq(chats.id, chatParticipants.chatId))
      .where(eq(chatParticipants.userId, userId))
      .orderBy(desc(chats.sortOrder), desc(chats.createdAt));

    // Enrich with last message
    const enriched = await Promise.all(
      userChats.map(async (chat) => {
        const lastMsg = await db
          .select()
          .from(messages)
          .where(eq(messages.chatId, chat.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          ...chat,
          lastMessage: lastMsg[0] || null,
        };
      })
    );

    return enriched;
  }),

  /**
   * Get info for a single chat with user's role
   */
  getChatInfo: supabaseProtectedProcedure
    .input(z.object({ chatId: z.number() }))
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id;
      if (!userId) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const chat = await db
        .select()
        .from(chats)
        .where(eq(chats.id, input.chatId))
        .limit(1);

      if (!chat.length) throw new Error("Chat not found");

      const participant = await db
        .select()
        .from(chatParticipants)
        .where(
          and(
            eq(chatParticipants.chatId, input.chatId),
            eq(chatParticipants.userId, userId)
          )
        )
        .limit(1);

      if (!participant.length) throw new Error("Not a participant");

      return {
        ...chat[0],
        userRole: participant[0].role,
        isMuted: participant[0].isMuted === 1,
      };
    }),

  /**
   * Get messages for a specific chat with pagination
   */
  getMessages: supabaseProtectedProcedure
    .input(
      z.object({
        chatId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id;
      if (!userId) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user is a participant
      const participant = await db
        .select()
        .from(chatParticipants)
        .where(
          and(
            eq(chatParticipants.chatId, input.chatId),
            eq(chatParticipants.userId, userId)
          )
        )
        .limit(1);

      if (!participant.length) throw new Error("Not a participant");

      // Get messages with author info
      const msgList = await db
        .select({
          id: messages.id,
          chatId: messages.chatId,
          userId: messages.userId,
          content: messages.content,
          mediaUrl: messages.mediaUrl,
          mediaType: messages.mediaType,
          replyToId: messages.replyToId,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt,
          author: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(messages)
        .innerJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.chatId, input.chatId))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return msgList.reverse(); // Return in chronological order
    }),

  /**
   * Send a message to a chat
   * - Validates user is participant
   * - Enforces info_only restrictions
   * - Sends push notifications
   */
  sendMessage: supabaseProtectedProcedure
    .input(
      z.object({
        chatId: z.number(),
        content: z.string().min(1),
        replyToId: z.number().optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(["image", "video", "file"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id;
      if (!userId) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user is participant
      const participant = await db
        .select()
        .from(chatParticipants)
        .where(
          and(
            eq(chatParticipants.chatId, input.chatId),
            eq(chatParticipants.userId, userId)
          )
        )
        .limit(1);

      if (!participant.length) throw new Error("Not a participant");

      // Get chat info
      const chat = await db
        .select()
        .from(chats)
        .where(eq(chats.id, input.chatId))
        .limit(1);

      if (!chat.length) throw new Error("Chat not found");

      // Enforce info_only restrictions
      if (chat[0].chatType === "info_only" && participant[0].role !== "admin") {
        throw new Error("Only admins can post in info_only chats");
      }

      // Insert message
      await db.insert(messages).values({
        chatId: input.chatId,
        userId: userId,
        content: input.content,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        replyToId: input.replyToId,
      });

      // Get the inserted message (most recent for this user in this chat)
      const newMessage = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.chatId, input.chatId),
            eq(messages.userId, userId)
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Send push notifications to other participants
      if (newMessage.length > 0) {
        await sendPushNotifications(db, input.chatId, userId, newMessage[0]);
      }

      return newMessage[0] || { success: false };
    }),

  /**
   * Mute/unmute notifications for a chat
   */
  setMuted: supabaseProtectedProcedure
    .input(z.object({ chatId: z.number(), isMuted: z.boolean() }))
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id;
      if (!userId) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(chatParticipants)
        .set({ isMuted: input.isMuted ? 1 : 0 })
        .where(
          and(
            eq(chatParticipants.chatId, input.chatId),
            eq(chatParticipants.userId, userId)
          )
        );

      return { success: true, isMuted: input.isMuted };
    }),

  /**
   * Upload media to a chat message
   * - Validates user is admin (for info_only chats)
   * - Saves file to S3-compatible storage
   * - Returns media URL
   */
  uploadMedia: supabaseProtectedProcedure
    .input(
      z.object({
        chatId: z.number(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.supabaseUser?.id;
      if (!userId) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user is participant
      const participant = await db
        .select()
        .from(chatParticipants)
        .where(
          and(
            eq(chatParticipants.chatId, input.chatId),
            eq(chatParticipants.userId, userId)
          )
        )
        .limit(1);

      if (!participant.length) throw new Error("Not a participant");

      // Get chat info
      const chat = await db
        .select()
        .from(chats)
        .where(eq(chats.id, input.chatId))
        .limit(1);

      if (!chat.length) throw new Error("Chat not found");

      // Enforce info_only restrictions
      if (chat[0].chatType === "info_only" && participant[0].role !== "admin") {
        throw new Error("Only admins can upload media in info_only chats");
      }

      // TODO: Upload to S3-compatible storage
      // For now, return a placeholder URL
      const mediaUrl = `https://s3.rtrader11.ru/chat-media/${input.chatId}/${Date.now()}-${input.fileName}`;

      return {
        mediaUrl,
        fileName: input.fileName,
        uploadedAt: new Date(),
      };
    }),
});

/**
 * Helper: Send push notifications to all participants (except sender, except muted)
 */
async function sendPushNotifications(
  db: any,
  chatId: number,
  senderId: string,
  message: any
) {
  try {
    // Get all participants except sender and muted users
    const recipients = await db
      .select({ userId: chatParticipants.userId })
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.chatId, chatId),
          ne(chatParticipants.userId, senderId),
          eq(chatParticipants.isMuted, 0)
        )
      );

    if (recipients.length === 0) return;

    // Get their active push tokens
    const tokens = await db
      .select()
      .from(pushTokens)
      .where(
        and(
          inArray(
            pushTokens.userId,
            recipients.map((r: any) => r.userId)
          ),
          eq(pushTokens.isActive, 1)
        )
      );

    if (tokens.length === 0) return;

    // TODO: Send via Expo Push API
    // const response = await fetch("https://exp.host/--/api/v2/push/send", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     to: tokens.map(t => t.token),
    //     title: "New message",
    //     body: message.content.substring(0, 100),
    //     data: { chatId, messageId: message.id },
    //   }),
    // });

    console.log(`[Push] Would send to ${tokens.length} devices`);
  } catch (error) {
    console.error("[Push] Error sending notifications:", error);
    // Don't throw - push is non-critical
  }
}
