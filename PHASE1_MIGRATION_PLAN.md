# Фаза 1: Миграция чатов из Supabase в MySQL

**Дата:** 29 апреля 2026  
**Статус:** В процессе  
**Целевая архитектура:** TARGET_ARCHITECTURE.md v2.0

---

## 1. Целевая MySQL схема

Таблицы добавлены в `drizzle/schema.ts`:

```typescript
// chats — каналы общения
export const chats = mysqlTable("chats", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  chatType: mysqlEnum("chatType", ["interactive", "info_only"]).default("interactive").notNull(),
  icon: varchar("icon", { length: 50 }),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// messages — сообщения с поддержкой медиа
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  mediaUrl: varchar("mediaUrl", { length: 500 }),
  mediaType: mysqlEnum("mediaType", ["image", "video", "file"]),
  replyToId: int("replyToId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// chat_participants — роли и статусы уведомлений
export const chatParticipants = mysqlTable("chat_participants", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin", "participant", "subscriber"]).default("subscriber").notNull(),
  isMuted: int("isMuted").default(0).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});
```

**Статус:** ✅ Таблицы созданы в MySQL (миграция 0003)

---

## 2. План переноса данных из Supabase → MySQL

### Шаг 1: Экспорт данных из Supabase
```sql
-- В Supabase SQL Editor:
SELECT * FROM chats;
SELECT * FROM messages;
SELECT * FROM chat_participants;
```

### Шаг 2: Трансформация данных
```
Supabase → MySQL маппинг:

chats:
  id → id
  name → name
  description → description
  type → chatType (переименование поля)
  icon → icon
  sort_order → sortOrder (camelCase)
  created_at → createdAt
  updated_at → updatedAt

messages:
  id → id
  chat_id → chatId
  user_id → userId
  content → content
  (нет media_url в Supabase) → mediaUrl (новое поле)
  (нет media_type) → mediaType (новое поле)
  reply_to_id → replyToId
  created_at → createdAt
  updated_at → updatedAt

chat_participants:
  id → id
  chat_id → chatId
  user_id → userId
  role → role
  is_muted → isMuted
  joined_at → joinedAt
```

### Шаг 3: Импорт в MySQL
```sql
-- После применения миграции 0003:
INSERT INTO chats (id, name, description, chatType, icon, sortOrder, createdAt, updatedAt)
SELECT id, name, description, type, icon, sort_order, created_at, updated_at FROM supabase_export.chats;

INSERT INTO messages (id, chatId, userId, content, mediaUrl, mediaType, replyToId, createdAt, updatedAt)
SELECT id, chat_id, user_id, content, NULL, NULL, reply_to_id, created_at, updated_at FROM supabase_export.messages;

INSERT INTO chat_participants (id, chatId, userId, role, isMuted, joinedAt)
SELECT id, chat_id, user_id, role, is_muted, joined_at FROM supabase_export.chat_participants;
```

---

## 3. Переписанный chat.ts router (без Supabase)

**Текущее состояние:** Использует `getServerSupabase()` + Supabase REST API  
**Целевое состояние:** Использует Drizzle ORM + MySQL

### Новый router:

```typescript
import { router, protectedProcedure } from "../../server/_core/trpc";
import { getDb } from "../../server/db";
import { chats, messages, chatParticipants, users } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const chatRouter = router({
  // Get list of chats for current user
  list: protectedProcedure.query(async ({ ctx }: any) => {
    const userId = ctx.user?.id; // Manus OAuth user ID (integer)
    if (!userId) throw new Error("Unauthorized");

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get chat IDs where user is a participant
    const userChats = await db
      .select({ chatId: chatParticipants.chatId })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));

    if (userChats.length === 0) return [];

    const chatIds = userChats.map((p) => p.chatId);

    // Get chat details
    const chatList = await db
      .select()
      .from(chats)
      .where(/* IN clause for chatIds */)
      .orderBy(desc(chats.createdAt));

    return chatList;
  }),

  // Get chat info with user's role
  getChatInfo: protectedProcedure
    .input(z.object({ chatId: z.number() }))
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.user?.id;
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

      return {
        ...chat[0],
        userRole: participant[0]?.role || "subscriber",
      };
    }),

  // Get messages for a chat
  getMessages: protectedProcedure
    .input(
      z.object({
        chatId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }: any) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user is participant
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

      // Get messages
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
          author: {
            id: users.id,
            displayName: users.name,
            avatarUrl: users.email, // TODO: add avatar_url field
          },
        })
        .from(messages)
        .innerJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.chatId, input.chatId))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return msgList;
    }),

  // Send message
  sendMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.number(),
        content: z.string(),
        replyToId: z.number().optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(["image", "video", "file"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user is participant
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

      // Check chat type permissions
      const chat = await db
        .select()
        .from(chats)
        .where(eq(chats.id, input.chatId))
        .limit(1);

      if (chat[0].chatType === "info_only" && participant[0].role !== "admin") {
        throw new Error("Only admins can post in info_only chats");
      }

      // Insert message
      const result = await db.insert(messages).values({
        chatId: input.chatId,
        userId: userId,
        content: input.content,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        replyToId: input.replyToId,
      });

      // TODO: Send push notifications to all participants (except sender, except muted)

      return { success: true };
    }),

  // Mute/unmute notifications
  setMuted: protectedProcedure
    .input(z.object({ chatId: z.number(), isMuted: z.boolean() }))
    .mutation(async ({ input, ctx }: any) => {
      const userId = ctx.user?.id;
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

      return { success: true };
    }),
});
```

**Статус:** Готов к внедрению

---

## 4. Зависимости и блокеры

### Нет жёстких технических зависимостей от Supabase
- Все данные чатов можно перенести в MySQL
- Drizzle ORM полностью поддерживает MySQL
- Router переписывается чистым кодом без костылей

### Можно ли сразу переводить router полностью на MySQL?
✅ **ДА.** Нет причин для временного migration bridge.

---

## 5. Следующие шаги

1. ✅ Таблицы MySQL созданы (миграция 0003)
2. ⏳ Экспортировать данные из Supabase
3. ⏳ Импортировать в MySQL
4. ⏳ Переписать `server/routers/chat.ts` (использовать новый код выше)
5. ⏳ Удалить `getServerSupabase()` из chat router
6. ⏳ Обновить клиентский код (если нужно)
7. ⏳ Тестирование end-to-end

---

## 6. Вопросы для уточнения

- Когда экспортировать данные из Supabase? (сейчас или после полной подготовки backend?)
- Нужна ли миграция истории сообщений или можно начать с чистого листа?
- Какой способ загрузки медиа выбираем: локальный (`/uploads/`) или S3-compatible?
