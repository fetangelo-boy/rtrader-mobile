# Фаза 1: Финальная MySQL схема для chat-контура

**Дата:** 29 апреля 2026  
**Версия:** 1.0  
**Статус:** Готово к реализации

---

## Целевая MySQL схема (Drizzle ORM)

### 1. `chats` — каналы общения

```typescript
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
```

**SQL:**
```sql
CREATE TABLE `chats` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `chatType` enum('interactive','info_only') NOT NULL DEFAULT 'interactive',
  `icon` varchar(50),
  `sortOrder` int DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
```

---

### 2. `messages` — сообщения с поддержкой медиа

```typescript
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
```

**SQL:**
```sql
CREATE TABLE `messages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `chatId` int NOT NULL,
  `userId` int NOT NULL,
  `content` text NOT NULL,
  `mediaUrl` varchar(500),
  `mediaType` enum('image','video','file'),
  `replyToId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`replyToId`) REFERENCES `messages`(`id`) ON DELETE SET NULL,
  INDEX `idx_chat_created` (`chatId`, `createdAt` DESC),
  INDEX `idx_user_created` (`userId`, `createdAt` DESC)
);
```

**Индексы:**
- `idx_chat_created` — быстрый поиск сообщений в чате по времени
- `idx_user_created` — быстрый поиск сообщений пользователя

---

### 3. `chat_participants` — участники чатов и их статусы

```typescript
export const chatParticipants = mysqlTable("chat_participants", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin", "participant", "subscriber"]).default("subscriber").notNull(),
  isMuted: int("isMuted").default(0).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});
```

**SQL:**
```sql
CREATE TABLE `chat_participants` (
  `id` int AUTO_INCREMENT NOT NULL,
  `chatId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('admin','participant','subscriber') NOT NULL DEFAULT 'subscriber',
  `isMuted` int NOT NULL DEFAULT 0,
  `joinedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_chat_user` (`chatId`, `userId`),
  INDEX `idx_user_chats` (`userId`, `chatId`)
);
```

**Индексы:**
- `unique_chat_user` — уникальность участия (пользователь не может быть дважды в одном чате)
- `idx_user_chats` — быстрый поиск всех чатов пользователя

---

## Связь с существующими таблицами

```
users (id, openId, name, email, role)
  ↓
  ├─→ messages (userId FK)
  ├─→ chat_participants (userId FK)
  └─→ push_tokens (userId FK)

chats (id, name, chatType)
  ↓
  ├─→ messages (chatId FK)
  └─→ chat_participants (chatId FK)
```

---

## Миграция Drizzle

**Файл:** `drizzle/0003_amusing_gabe_jones.sql`  
**Статус:** ✅ Создана и готова к применению

```sql
CREATE TABLE `chat_participants` (
  `id` int AUTO_INCREMENT NOT NULL,
  `chatId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('admin','participant','subscriber') NOT NULL DEFAULT 'subscriber',
  `isMuted` int NOT NULL DEFAULT 0,
  `joinedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `chat_participants_id` PRIMARY KEY(`id`)
);

CREATE TABLE `chats` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `chatType` enum('interactive','info_only') NOT NULL DEFAULT 'interactive',
  `icon` varchar(50),
  `sortOrder` int DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chats_id` PRIMARY KEY(`id`)
);

CREATE TABLE `messages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `chatId` int NOT NULL,
  `userId` int NOT NULL,
  `content` text NOT NULL,
  `mediaUrl` varchar(500),
  `mediaType` enum('image','video','file'),
  `replyToId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
```

---

## Типы TypeScript (автогенерируемые из Drizzle)

```typescript
export type Chat = typeof chats.$inferSelect;
export type InsertChat = typeof chats.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type InsertChatParticipant = typeof chatParticipants.$inferInsert;
```

---

## Примеры запросов (Drizzle ORM)

### Получить все чаты пользователя
```typescript
const userChats = await db
  .select()
  .from(chats)
  .innerJoin(chatParticipants, eq(chats.id, chatParticipants.chatId))
  .where(eq(chatParticipants.userId, userId));
```

### Получить сообщения чата с авторами
```typescript
const messages = await db
  .select()
  .from(messages)
  .innerJoin(users, eq(messages.userId, users.id))
  .where(eq(messages.chatId, chatId))
  .orderBy(desc(messages.createdAt))
  .limit(50);
```

### Проверить роль пользователя в чате
```typescript
const participant = await db
  .select()
  .from(chatParticipants)
  .where(
    and(
      eq(chatParticipants.chatId, chatId),
      eq(chatParticipants.userId, userId)
    )
  )
  .limit(1);

const canPost = participant[0]?.role === "admin" || chat.chatType === "interactive";
```

### Отправить сообщение с уведомлениями
```typescript
// 1. Вставить сообщение
const newMessage = await db.insert(messages).values({
  chatId,
  userId,
  content,
  mediaUrl,
  mediaType,
  replyToId,
});

// 2. Получить всех участников (кроме отправителя, кроме отключивших)
const recipients = await db
  .select({ userId: chatParticipants.userId })
  .from(chatParticipants)
  .where(
    and(
      eq(chatParticipants.chatId, chatId),
      ne(chatParticipants.userId, userId),
      eq(chatParticipants.isMuted, 0)
    )
  );

// 3. Получить их push-токены
const tokens = await db
  .select()
  .from(pushTokens)
  .where(
    and(
      inArray(pushTokens.userId, recipients.map(r => r.userId)),
      eq(pushTokens.isActive, 1)
    )
  );

// 4. Отправить через Expo Push API
// TODO: implementPushNotifications(tokens, message);
```

---

## Готовность

✅ Schema определена в Drizzle ORM  
✅ Миграция создана (0003)  
✅ Типы TypeScript готовы  
✅ Примеры запросов готовы  
✅ Готово к реализации router
