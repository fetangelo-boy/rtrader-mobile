# Фаза 1: План импорта данных из Supabase в MySQL

**Дата:** 29 апреля 2026  
**Статус:** Готово к выполнению  
**Целевая архитектура:** TARGET_ARCHITECTURE.md v2.0

---

## 1. Экспорт данных из Supabase

### Шаг 1.1: Подготовить SQL запросы для экспорта

**Файл:** `SUPABASE_EXPORT_QUERIES.sql`

Запросы для экспорта в CSV:

```sql
-- 1. Export chats (с переименованием полей в camelCase)
COPY (
  SELECT 
    id, 
    name, 
    description, 
    type as chatType, 
    icon, 
    sort_order as sortOrder, 
    created_at as createdAt, 
    updated_at as updatedAt
  FROM chats
  ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- 2. Export messages (с добавлением NULL для новых полей)
COPY (
  SELECT 
    id, 
    chat_id as chatId, 
    user_id as userId, 
    content, 
    NULL as mediaUrl, 
    NULL as mediaType, 
    reply_to_id as replyToId, 
    created_at as createdAt, 
    updated_at as updatedAt
  FROM messages
  ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- 3. Export chat_participants (с переименованием полей)
COPY (
  SELECT 
    id, 
    chat_id as chatId, 
    user_id as userId, 
    role, 
    is_muted as isMuted, 
    joined_at as joinedAt
  FROM chat_participants
  ORDER BY id
) TO STDOUT WITH CSV HEADER;
```

### Шаг 1.2: Выполнить экспорт в Supabase

1. Открыть Supabase SQL Editor
2. Запустить каждый COPY запрос отдельно
3. Сохранить результаты в CSV файлы:
   - `chats_export.csv`
   - `messages_export.csv`
   - `chat_participants_export.csv`

---

## 2. Трансформация данных

### Маппинг полей Supabase → MySQL

| Таблица | Supabase | MySQL | Примечание |
|---------|----------|-------|-----------|
| **chats** | | | |
| | id | id | Сохранить ID для FK |
| | name | name | ✓ |
| | description | description | ✓ |
| | type | chatType | Переименование |
| | icon | icon | ✓ |
| | sort_order | sortOrder | camelCase |
| | created_at | createdAt | camelCase |
| | updated_at | updatedAt | camelCase |
| **messages** | | | |
| | id | id | Сохранить ID для FK |
| | chat_id | chatId | Переименование |
| | user_id | userId | Переименование |
| | content | content | ✓ |
| | (нет) | mediaUrl | NULL (новое поле) |
| | (нет) | mediaType | NULL (новое поле) |
| | reply_to_id | replyToId | Переименование |
| | created_at | createdAt | camelCase |
| | updated_at | updatedAt | camelCase |
| **chat_participants** | | | |
| | id | id | Сохранить ID |
| | chat_id | chatId | Переименование |
| | user_id | userId | Переименование |
| | role | role | ✓ |
| | is_muted | isMuted | Переименование |
| | joined_at | joinedAt | camelCase |

---

## 3. Импорт в MySQL

**ВАЖНО:** Миграция истории сообщений является **ОБЯЗАТЕЛЬНОЙ** частью импорта (см. PHASE1_MESSAGE_HISTORY_ASSESSMENT.md). Объём небольшой, процесс быстрый и безопасный, есть ценный контент.

### Шаг 3.1: Проверить миграция применена

```bash
# На Beget VPS (после развёртывания):
mysql -u rtrader -p rtrader11_db -e "SHOW TABLES LIKE 'chat%';"
```

**Ожидаемый результат:**
```
Tables_in_rtrader11_db (chat%)
chats
chat_participants
messages
```

### Шаг 3.2: Импортировать данные

**Вариант A: Через MySQL LOAD DATA (быстро)**

```sql
-- Загрузить chats
LOAD DATA LOCAL INFILE '/tmp/chats_export.csv'
INTO TABLE chats
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, name, description, chatType, icon, sortOrder, createdAt, updatedAt);

-- Загрузить messages
LOAD DATA LOCAL INFILE '/tmp/messages_export.csv'
INTO TABLE messages
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, chatId, userId, content, mediaUrl, mediaType, replyToId, createdAt, updatedAt);

-- Загрузить chat_participants
LOAD DATA LOCAL INFILE '/tmp/chat_participants_export.csv'
INTO TABLE chat_participants
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, chatId, userId, role, isMuted, joinedAt);
```

**Вариант B: Через Python script (с валидацией)**

```python
import csv
import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="rtrader",
    password="***",
    database="rtrader11_db"
)
cursor = conn.cursor()

# Import chats
with open('chats_export.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        cursor.execute("""
            INSERT INTO chats (id, name, description, chatType, icon, sortOrder, createdAt, updatedAt)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (row['id'], row['name'], row['description'], row['chatType'], 
              row['icon'], row['sortOrder'], row['createdAt'], row['updatedAt']))

# Import messages
with open('messages_export.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        cursor.execute("""
            INSERT INTO messages (id, chatId, userId, content, mediaUrl, mediaType, replyToId, createdAt, updatedAt)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (row['id'], row['chatId'], row['userId'], row['content'],
              row['mediaUrl'], row['mediaType'], row['replyToId'], row['createdAt'], row['updatedAt']))

# Import chat_participants
with open('chat_participants_export.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        cursor.execute("""
            INSERT INTO chat_participants (id, chatId, userId, role, isMuted, joinedAt)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (row['id'], row['chatId'], row['userId'], row['role'], row['isMuted'], row['joinedAt']))

conn.commit()
cursor.close()
conn.close()
print("Import complete!")
```

### Шаг 3.3: Валидация импорта

```sql
-- Проверить количество строк
SELECT 'chats' as table_name, COUNT(*) as count FROM chats
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'chat_participants', COUNT(*) FROM chat_participants;

-- Проверить целостность FK
SELECT COUNT(*) as orphaned_messages 
FROM messages m 
WHERE NOT EXISTS (SELECT 1 FROM chats WHERE id = m.chatId);

SELECT COUNT(*) as orphaned_participants 
FROM chat_participants cp 
WHERE NOT EXISTS (SELECT 1 FROM chats WHERE id = cp.chatId);

-- Проверить типы данных
SELECT chatType, COUNT(*) FROM chats GROUP BY chatType;
SELECT role, COUNT(*) FROM chat_participants GROUP BY role;
```

---

## 4. Зависимости от Supabase (остаточные)

### Проверка остаточных зависимостей в коде

```bash
# Найти все упоминания Supabase в backend
grep -r "getServerSupabase\|supabaseProtectedProcedure\|supabase\." server/ --include="*.ts"

# Ожидаемый результат:
# server/routers/chat.ts — должно быть ПУСТО (все переписано на Drizzle)
# server/_core/trpc.ts — может быть (для других routers)
# server/routers/notifications.ts — может быть (для других routers)
```

### Остаточные зависимости (после Фазы 1):

| Файл | Зависимость | Статус | Примечание |
|------|-------------|--------|-----------|
| `server/routers/chat.ts` | ❌ Нет | ✅ Полностью на Drizzle | Фаза 1 завершена |
| `server/routers/profile.ts` | ❌ Нет | ⏳ Проверить | Если использует Supabase, переписать |
| `server/routers/account.ts` | ❌ Нет | ⏳ Проверить | Если использует Supabase, переписать |
| `server/_core/notification.ts` | ❌ Нет | ⏳ Проверить | Если использует Supabase, переписать |
| `lib/supabase.ts` | ✓ Есть | ⏳ Удалить | После полного отказа от Supabase |
| `lib/supabase-client.ts` | ✓ Есть | ⏳ Удалить | После полного отказа от Supabase |

---

## 5. Контрольный список

**Перед импортом:**
- [ ] Экспортированы CSV файлы из Supabase
- [ ] Проверены маппинги полей
- [ ] Миграция 0003 применена на целевой MySQL
- [ ] Backup существующих данных (если есть)

**После импорта:**
- [ ] Проверены количества строк
- [ ] Проверена целостность FK
- [ ] Проверены типы данных
- [ ] Нет orphaned записей
- [ ] Chat router работает с новыми данными

**После полного отказа от Supabase:**
- [ ] Все routers переписаны на Drizzle
- [ ] Удалены `getServerSupabase()` вызовы
- [ ] Удалены файлы `lib/supabase.ts` и `lib/supabase-client.ts`
- [ ] Удалены Supabase env переменные

---

## 6. Откат в случае проблем

Если импорт не удался:

```sql
-- Очистить таблицы (если нужно)
TRUNCATE TABLE messages;
TRUNCATE TABLE chat_participants;
TRUNCATE TABLE chats;

-- Или удалить таблицы и переприменить миграцию
DROP TABLE messages;
DROP TABLE chat_participants;
DROP TABLE chats;

-- Переприменить миграцию
pnpm db:push
```

---

## 7. Следующие шаги

1. ✅ Schema определена (PHASE1_FINAL_SCHEMA.md)
2. ✅ Router переписан (server/routers/chat.ts)
3. ⏳ Экспортировать данные из Supabase
4. ⏳ Импортировать в MySQL
5. ⏳ Валидировать данные
6. ⏳ Тестировать chat router на новых данных
7. ⏳ Переписать остальные routers (profile, account, etc.)
8. ⏳ Полный отказ от Supabase
