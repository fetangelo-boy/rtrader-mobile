# Целевая архитектура RTrader: Beget VPS (без Supabase)

**Версия:** 2.0 (АКТУАЛЬНАЯ)  
**Дата создания:** 29 апреля 2026  
**Последнее обновление:** 29 апреля 2026, 12:15 UTC+3  
**Статус:** ✅ ФИНАЛЬНАЯ ОПОРНАЯ АРХИТЕКТУРА (без смешения контуров)  
**Принцип:** Полный отказ от Supabase. Все данные и логика на Beget VPS (Россия).

> **ВАЖНО:** Этот документ является главной точкой опоры для архитектуры RTrader. Он учитывает все последние договорённости (29.04.2026):
> - ✅ Полный уход из Supabase (без постоянной синхронизации)
> - ✅ Push-уведомления для всех чатов (не только info_only)
> - ✅ Единая MySQL база на Beget VPS
> - ✅ JWT авторизация (отказ от Supabase Auth)
> - ✅ Локальное хранилище медиа (или S3-compatible)
> - ✅ Access control в Express middleware (вместо PostgreSQL RLS)
> - ✅ Polling/SSE вместо Supabase Realtime
>
> **В следующих сессиях ссылайтесь на этот файл как на единственный источник истины по архитектуре.**

---

## 1. DATABASE (Единая MySQL на Beget)

### Инфраструктура
- **СУБД:** MySQL 8.0+ (встроенная в Beget VPS или DBaaS Beget)
- **ORM:** Drizzle ORM (mysql2 драйвер)
- **Миграции:** Drizzle Kit (drizzle-kit generate + migrate)
- **Локация:** Beget VPS, Санкт-Петербург, Россия
- **Соответствие:** 152-ФЗ (ПД хранятся в РФ)

### Таблицы (финальная схема)

#### `users` — единый реестр пользователей
```
id              INT AUTO_INCREMENT PRIMARY KEY
uuid            CHAR(36) UNIQUE NOT NULL          -- UUID v4, используется в API
email           VARCHAR(255) UNIQUE NOT NULL      -- ПД, хранится в РФ
password_hash   VARCHAR(255) NOT NULL             -- Bcrypt хеш
display_name    VARCHAR(100)
telegram_id     BIGINT UNIQUE                     -- ПД, хранится в РФ
telegram_username VARCHAR(100)                   -- ПД, хранится в РФ
avatar_url      VARCHAR(500)
role            ENUM('subscriber', 'admin')       -- Роль
created_at      DATETIME DEFAULT NOW()
updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
```

#### `subscriptions` — подписки пользователей
```
id              INT AUTO_INCREMENT PRIMARY KEY
user_id         INT NOT NULL, FK(users.id)
status          ENUM('active', 'expired', 'blocked')
plan            VARCHAR(50)                       -- 'basic', 'vip', etc.
approved_until  DATETIME NOT NULL                 -- Дата окончания подписки
source          ENUM('bot', 'admin', 'site')      -- Откуда пришла подписка
created_at      DATETIME DEFAULT NOW()
updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
```

#### `chats` — чаты (общие для приложения и сайта)
```
id              INT AUTO_INCREMENT PRIMARY KEY
name            VARCHAR(100) NOT NULL
description     TEXT
chat_type       ENUM('interactive', 'info_only')  -- interactive: все могут писать, info_only: только admins
icon            VARCHAR(50)
sort_order      INT
created_at      DATETIME DEFAULT NOW()
updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
```

#### `messages` — сообщения в чатах
```
id              INT AUTO_INCREMENT PRIMARY KEY
chat_id         INT NOT NULL, FK(chats.id)
user_id         INT NOT NULL, FK(users.id)
content         TEXT NOT NULL                     -- Текст сообщения
media_url       VARCHAR(500)                      -- URL фото/видео (S3 или локальный)
media_type      ENUM('image', 'video', 'file')    -- Тип медиа
reply_to_id     INT, FK(messages.id)              -- Ответ на сообщение
created_at      DATETIME DEFAULT NOW()
updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
```

#### `chat_participants` — участники чатов и их роли
```
id              INT AUTO_INCREMENT PRIMARY KEY
chat_id         INT NOT NULL, FK(chats.id)
user_id         INT NOT NULL, FK(users.id)
role            ENUM('admin', 'participant', 'subscriber')
is_muted        BOOLEAN DEFAULT FALSE             -- Отключены ли уведомления
joined_at       DATETIME DEFAULT NOW()
```

#### `push_tokens` — Expo push-токены для уведомлений
```
id              INT AUTO_INCREMENT PRIMARY KEY
user_id         INT NOT NULL, FK(users.id)
expo_push_token VARCHAR(255) UNIQUE NOT NULL
device_type     ENUM('android', 'ios', 'web')
is_active       BOOLEAN DEFAULT TRUE
created_at      DATETIME DEFAULT NOW()
updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()

INDEX idx_user_active (user_id, is_active)  -- Для быстрого поиска активных токенов
```

#### `push_notification_log` — история отправленных уведомлений (для отладки)
```
id              INT AUTO_INCREMENT PRIMARY KEY
user_id         INT NOT NULL, FK(users.id)
chat_id         INT, FK(chats.id)
title           VARCHAR(255)
body            TEXT
status          ENUM('sent', 'failed', 'delivered')
sent_at         DATETIME DEFAULT NOW()
```

#### `consent_log` — согласия на обработку ПД (152-ФЗ требование)
```
id              INT AUTO_INCREMENT PRIMARY KEY
user_id         INT NOT NULL, FK(users.id)
consent_type    VARCHAR(50)                       -- 'privacy_policy', 'data_processing'
consent_text    TEXT
ip_address      VARCHAR(45)
user_agent      TEXT
given_at        DATETIME DEFAULT NOW()
revoked_at      DATETIME
```

---

## 2. AUTH (Собственная JWT на Beget)

### Механизм
- **Тип:** JWT (JSON Web Token)
- **Хранилище:** MySQL таблица `users` (password_hash)
- **Генерация токена:** На сервере (Express endpoint `/api/auth/login`)
- **Хранение на клиенте:** 
  - **Native (iOS/Android):** expo-secure-store (защищённое хранилище ОС)
  - **Web:** HTTP-only cookie (автоматически отправляется с каждым запросом)
- **Валидация:** Middleware в Express проверяет JWT подпись и expiration
- **Refresh:** Refresh token в httpOnly cookie (30 дней), access token в памяти (15 минут)

### Endpoints
```
POST /api/auth/register
  Input: { email, password, telegram_id, telegram_username }
  Output: { user, accessToken, refreshToken }

POST /api/auth/login
  Input: { email, password }
  Output: { user, accessToken, refreshToken }

POST /api/auth/refresh
  Input: (refresh token в cookie)
  Output: { accessToken }

POST /api/auth/logout
  Input: (accessToken)
  Output: { success: true }

GET /api/auth/me
  Input: (accessToken в header)
  Output: { user }
```

### Отличие от текущего
- **Текущее:** Manus OAuth (внешняя система) + Supabase Auth (для чатов)
- **Целевое:** Единая собственная JWT система на Beget

---

## 3. STORAGE (S3-совместимое хранилище)

### Опции

#### Вариант A: S3-совместимое на Beget
- **Сервис:** Beget Object Storage (S3-compatible)
- **Цена:** Включена в тариф VPS
- **Доступ:** AWS SDK (aws-sdk или @aws-sdk/client-s3)
- **Бакеты:** `rtrader-media` (для фото/видео чатов)
- **Публичный доступ:** Да (для отображения в приложении)

#### Вариант B: Локальное хранилище на Beget
- **Путь:** `/var/www/rtrader/uploads/`
- **Сервер:** Nginx раздаёт статику
- **URL:** `https://rtrader11.ru/uploads/chat-media/{uuid}.jpg`
- **Преимущества:** Простота, нет доп. сервиса
- **Недостатки:** Нужны бэкапы, масштабирование сложнее

**Рекомендация:** Вариант B для MVP (простота), позже перейти на S3 если нужна масштабируемость.

### Загрузка медиа
```
POST /api/chat/uploadMedia
  Input: { chatId, file (multipart), type ('image'|'video') }
  Auth: JWT (user должен быть admin для info_only чатов)
  Output: { media_url, media_id }
  
  Логика:
  1. Проверить, что пользователь — admin в чате (для info_only)
  2. Валидировать файл (размер, MIME-type)
  3. Сохранить на диск / S3
  4. Вернуть URL
  5. Клиент отправляет сообщение с media_url
```

---

## 4. CHAT / MESSAGES (MySQL + Express API)

### Архитектура
- **Хранилище:** MySQL таблицы `chats`, `messages`, `chat_participants`
- **API:** Express endpoints (tRPC или REST)
- **Доступ:** Через JWT авторизацию
- **Realtime:** Polling (клиент периодически запрашивает новые сообщения) или SSE (Server-Sent Events)

### Endpoints

#### Получить список чатов
```
GET /api/chat/list
  Auth: JWT
  Output: [ { id, name, description, chat_type, unread_count, last_message } ]
  
  Логика:
  1. Найти все чаты, где пользователь — participant
  2. Для каждого чата вернуть последнее сообщение и count непрочитанных
```

#### Получить сообщения чата
```
GET /api/chat/:chatId/messages?limit=50&offset=0
  Auth: JWT
  Output: [ { id, user_id, content, media_url, reply_to_id, created_at, author: { id, display_name, avatar_url } } ]
  
  Логика:
  1. Проверить, что пользователь — participant чата
  2. Вернуть сообщения (с пагинацией)
```

#### Отправить сообщение
```
POST /api/chat/:chatId/message
  Auth: JWT
  Input: { content, reply_to_id?, media_url? }
  Output: { id, created_at, ... }
  
  Логика:
  1. Проверить, что пользователь — participant чата
  2. Если chat_type == 'info_only' и пользователь не admin → ошибка 403
  3. Вставить в messages
  4. Отправить push-уведомления всем участникам (кроме отправителя, кроме отключивших)
  5. Вернуть сообщение
```

#### Ответить на сообщение (Reply)
```
POST /api/chat/:chatId/message
  Auth: JWT
  Input: { content, reply_to_id: 123, ... }
  Output: { id, reply_to: { id, content, author }, ... }
```

#### Отключить/включить уведомления (Mute/Unmute)
```
PATCH /api/chat/:chatId/mute
  Auth: JWT
  Input: { is_muted: true|false }
  Output: { is_muted }
  
  Логика:
  1. Обновить chat_participants.is_muted для пользователя
```

### Access Control (вместо RLS)
```
Логика в API-слое (Express middleware):

Для info_only чатов:
  - Читать: все subscribers
  - Писать: только admins

Для interactive чатов:
  - Читать: все subscribers
  - Писать: все subscribers (кроме заблокированных)

Проверка в каждом endpoint:
  1. Получить role пользователя в чате из chat_participants
  2. Проверить, что chat_type позволяет операцию
  3. Если нет — вернуть 403 Forbidden
```

---

## 5. PUSH NOTIFICATIONS (Expo Push API)

### Архитектура
- **Сервис:** Expo Push API (https://exp.host/--/api/v2/push/send)
- **Токены:** Хранятся в MySQL таблице `push_tokens`
- **Отправка:** Из Express backend (сервер инициирует)

### Endpoints

#### Регистрация токена (клиент → сервер)
```
POST /api/notifications/registerToken
  Auth: JWT
  Input: { expo_push_token, device_type }
  Output: { success: true }
  
  Логика:
  1. Вставить в push_tokens (или обновить если уже есть)
```

#### Отправка push-уведомлений (admin endpoint)
```
POST /api/notifications/sendBatch
  Auth: JWT (admin only)
  Input: {
    type: 'chat_message' | 'admin_broadcast',
    chatId?: 123,
    userIds?: [1, 2, 3],
    title: 'Новое сообщение',
    body: 'В чате "Аналитика" новое сообщение',
    data: { chatId: 123, messageId: 456, screen: 'ChatScreen' }
  }
  Output: { sent: 10, failed: 2, results: [...] }
  
  Логика:
  1. Найти целевых пользователей:
     - Если chatId: все participants чата
     - Если userIds: только указанные
     - Если ни то ни другое: все active subscribers
  2. Исключить пользователей, у которых is_muted=true для этого чата
  3. Получить их push_tokens из базы
  4. Отправить через Expo Push API
  5. Логировать результаты в push_notification_log
```

#### Получение истории уведомлений (для отладки)
```
GET /api/notifications/log?limit=100
  Auth: JWT (admin only)
  Output: [ { id, user_id, chat_id, title, body, status, sent_at } ]
```

### Логика отправки при новом сообщении
```
Когда пользователь отправляет сообщение в чат:

1. Вставить сообщение в messages
2. Получить всех participants чата (кроме отправителя)
3. Для каждого participant:
   a. Проверить, что is_muted=false (для этого чата)
   b. Получить его активные push_tokens (is_active=true)
   c. Отправить через Expo Push API
   d. Логировать результат (sent/failed)
4. Отправить push-уведомление:
   - Заголовок: "Новое сообщение в [chat_name]"
   - Тело: "[author_name]: [message_preview]"
   - Data: { chatId, messageId, screen: 'ChatScreen' }

Это работает для ВСЕХ чатов (info_only и interactive),
если пользователь не отключил уведомления (is_muted=false).
```

### Payload структура
```json
{
  "to": "ExponentPushToken[...]",
  "sound": "default",
  "title": "Новое сообщение в Аналитика",
  "body": "Иван: Отличная идея по GAZP",
  "data": {
    "chatId": "123",
    "messageId": "456",
    "screen": "ChatScreen",
    "params": { "chatId": "123" }
  },
  "badge": 1
}
```

### Навигация при тапе на уведомление (клиент)
```
Когда пользователь тапает на push-уведомление:

1. Expo Notifications слушает события
2. Получает data.screen и data.params
3. Использует expo-router для навигации:
   router.push({
     pathname: "/chat/[chatId]",
     params: { chatId: data.chatId }
   })
```

---

## 6. DEPLOYMENT (Beget VPS)

### Инфраструктура
- **Хостинг:** Beget VPS, Санкт-Петербург
- **Тариф:** "Старт" (1 ядро, 1GB RAM, 10GB NVMe, ~480₽/мес)
- **ОС:** Ubuntu 22.04 LTS
- **Контейнеризация:** Docker (опционально)

### Компоненты на VPS

#### 1. Node.js Backend (Express)
```
Порт: 3000 (внутренний)
Процесс: PM2 (автоматический перезапуск)
Переменные: DATABASE_URL, JWT_SECRET, EXPO_ACCESS_TOKEN
Логи: /var/log/rtrader-backend.log
```

#### 2. Nginx (Reverse Proxy)
```
Порт: 80 → 443 (HTTPS)
Конфиг: /etc/nginx/sites-available/rtrader11.ru
Сертификат: Let's Encrypt (certbot)

Маршруты:
  /api/* → http://localhost:3000
  / → статика React SPA (если есть)
  /uploads/* → локальные файлы медиа
```

#### 3. MySQL
```
Порт: 3306 (локально)
Данные: /var/lib/mysql/
Бэкапы: cron job каждый день в 02:00
```

#### 4. Telegram Bot (Python)
```
Тип: Polling (не webhook)
Процесс: systemd service или PM2
Переменные: BOT_TOKEN, API_URL
Логи: /var/log/rtrader-bot.log
```

### Структура директорий
```
/var/www/rtrader/
├── backend/                    # Node.js приложение
│   ├── dist/                   # Скомпилированный код
│   ├── node_modules/
│   ├── .env                    # Переменные окружения
│   └── package.json
├── uploads/                    # Медиа файлы (фото/видео)
│   └── chat-media/
├── bot/                        # Python Telegram bot
│   ├── main.py
│   └── .env
└── backups/                    # Резервные копии БД
    └── mysql-daily-*.sql
```

### Процесс запуска

#### Первый раз (после SSH на VPS)
```bash
# 1. Установить зависимости
sudo apt update && sudo apt install -y nodejs npm mysql-server nginx certbot python3-pip

# 2. Клонировать репозиторий
cd /var/www && git clone https://github.com/fetangelo-boy/rtrader-mobile.git rtrader

# 3. Установить Node зависимости
cd /var/www/rtrader/backend && npm install

# 4. Создать .env
cat > .env << EOF
DATABASE_URL=mysql://root:password@localhost:3306/rtrader
JWT_SECRET=your-secret-key-here
EXPO_ACCESS_TOKEN=your-expo-token
NODE_ENV=production
EOF

# 5. Запустить миграции
npm run db:push

# 6. Собрать backend
npm run build

# 7. Запустить через PM2
pm2 start dist/index.js --name rtrader-backend

# 8. Настроить Nginx
sudo cp nginx.conf /etc/nginx/sites-available/rtrader11.ru
sudo ln -s /etc/nginx/sites-available/rtrader11.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 9. Настроить SSL
sudo certbot certonly --nginx -d rtrader11.ru

# 10. Запустить бот
cd /var/www/rtrader/bot && python3 main.py &
```

### Мониторинг и обслуживание
```bash
# Проверить статус backend
pm2 status

# Просмотреть логи
pm2 logs rtrader-backend

# Перезагрузить backend
pm2 restart rtrader-backend

# Резервная копия БД
mysqldump -u root -p rtrader > /var/www/rtrader/backups/backup-$(date +%Y%m%d).sql

# Проверить место на диске
df -h
```

---

## 7. CUTOVER PLAN (Переключение с Supabase на Beget)

### Фаза 0: Подготовка (День 1)
1. Зарегистрировать аккаунт на Beget
2. Создать VPS с Docker
3. Получить SSH доступ
4. Установить базовое ПО (Node, MySQL, Nginx)

### Фаза 1: Миграция данных (День 2)
1. Экспортировать данные из Supabase:
   ```bash
   # Из Supabase SQL Editor
   SELECT * FROM users;
   SELECT * FROM chats;
   SELECT * FROM messages;
   SELECT * FROM chat_participants;
   ```
2. Трансформировать данные (если нужно адаптировать схему)
3. Импортировать в MySQL на Beget:
   ```bash
   mysql -u root -p rtrader < migration-data.sql
   ```

### Фаза 2: Адаптация кода (День 2-3)
1. **Backend (`server/`):**
   - Переключить Drizzle с `pg` на `mysql2`
   - Адаптировать `server/routers/chat.ts` (убрать Supabase client)
   - Адаптировать auth (убрать Supabase Auth, оставить JWT)
   - Добавить endpoints для push notifications

2. **Мобильное приложение (`app/`):**
   - Изменить API URL в `lib/trpc.ts` на `https://rtrader11.ru/api`
   - Удалить импорты Supabase client
   - Тестировать на эмуляторе

3. **Telegram Bot:**
   - Изменить API URL на `https://rtrader11.ru/api`

### Фаза 3: Тестирование (День 3)
1. Локальное тестирование на sandbox
2. Тестирование на Beget VPS
3. Проверить:
   - Авторизацию (login/register)
   - Получение чатов
   - Отправку сообщений
   - Загрузку медиа
   - Push-уведомления

### Фаза 4: Go Live (День 4)
1. Обновить DNS (если нужно)
2. Переключить мобильное приложение на новый API
3. Переключить Telegram-бота на новый API
4. Мониторить логи и ошибки
5. Готовность к откату (если что-то сломалось)

### Откат (если нужно)
```bash
# Если что-то пошло не так:
1. Переключить мобильное приложение обратно на старый API
2. Переключить бота обратно
3. Диагностировать проблему на Beget
4. Повторить попытку
```

---

## 8. Что НЕ меняется

| Компонент | Статус |
|-----------|--------|
| Мобильное приложение (UI) | Без изменений |
| Telegram-боты (логика) | Без изменений (только API URL) |
| Сайт rtrader11.ru | Без изменений (если это статика) |

---

## 9. Что меняется

| Компонент | Было | Стало |
|-----------|------|-------|
| СУБД | Supabase PostgreSQL | MySQL на Beget |
| ORM | Drizzle (pg) | Drizzle (mysql2) |
| Auth | Supabase Auth | JWT на Beget |
| API | Supabase REST API | Express на Beget |
| Storage | Supabase Storage | Локальный на Beget |
| Realtime | Supabase Realtime | Polling / SSE |
| RLS | PostgreSQL RLS | Проверки в API-слое |
| Хостинг | AWS (за рубежом) | Beget (Россия) |
| ПД | Нарушение 152-ФЗ | Соответствие 152-ФЗ |

---

## 10. Итоговая архитектура (диаграмма)

```
┌─────────────────────────────────────────────────────────────┐
│                    BEGET VPS (Россия)                       │
│              Санкт-Петербург, 1 ядро, 1GB RAM              │
│                                                             │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐       │
│  │  Nginx   │  │ Node.js     │  │ Python Telegram  │       │
│  │ :80/:443 │─→│ Express API │  │ Bot (polling)    │       │
│  │          │  │ :3000       │  │                  │       │
│  └──────────┘  └──────┬──────┘  └──────────────────┘       │
│                       │                                     │
│                ┌──────▼──────┐                              │
│                │   MySQL      │                              │
│                │   :3306      │                              │
│                │              │                              │
│                │ users        │                              │
│                │ subscriptions │                             │
│                │ chats        │                              │
│                │ messages     │                              │
│                │ push_tokens  │                              │
│                │ consent_log  │                              │
│                └──────────────┘                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /var/www/rtrader/uploads/                            │  │
│  │ Локальное хранилище медиа (фото/видео чатов)        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │ Браузер  │         │ Мобильное│         │Telegram │
    │ (сайт)   │         │ приложение        │ Боты    │
    │          │         │ (iOS/Android)     │         │
    └──────────┘         └──────────┘         └─────────┘
```

---

## 11. Резюме: Ключевые отличия от текущего контура

| Аспект | Текущее (Supabase) | Целевое (Beget) |
|--------|-------------------|-----------------|
| **Авторизация** | Supabase Auth (UUID) | JWT на Beget (integer user_id) |
| **Чаты/сообщения** | Supabase PostgreSQL | MySQL на Beget |
| **Медиа** | Supabase Storage | Локальный /uploads/ на Beget |
| **Push-токены** | Supabase таблица | MySQL таблица на Beget |
| **RLS** | PostgreSQL RLS policies | Проверки в Express middleware |
| **Realtime** | Supabase Realtime | Polling (клиент запрашивает каждые N сек) |
| **Хостинг** | AWS (за рубежом) | Beget VPS (Россия) |
| **Стоимость** | ~$25-50/мес | ~480₽/мес (~$5) |
| **Соответствие 152-ФЗ** | Нарушение | Полное соответствие |

---

## 12. Следующие шаги

**Фаза 1: Адаптация backend под целевую архитектуру (MySQL + Express)**
- [ ] Адаптировать `server/routers/chat.ts` под MySQL (убрать Supabase client, использовать Drizzle)
- [ ] Добавить `messages.media_url` и `messages.media_type` в Drizzle schema
- [ ] Создать endpoint `POST /api/chat/uploadMedia` (с проверкой прав admin/participant)
- [ ] Создать endpoint `POST /api/notifications/sendBatch` (admin-only, поддержка фильтров)
- [ ] Реализовать JWT авторизацию (если ещё нет полностью)
- [ ] Адаптировать все routers (убрать Supabase client, использовать Drizzle + MySQL)

**Фаза 2: Подготовить Beget VPS**
- [ ] Зарегистрировать аккаунт на Beget
- [ ] Создать VPS "Старт"
- [ ] Установить Node.js, MySQL, Nginx
- [ ] Получить SSH доступ

**Фаза 3: Миграция данных**
- [ ] Экспортировать данные из Supabase
- [ ] Адаптировать schema
- [ ] Импортировать в MySQL на Beget

**Фаза 4: Cutover**
- [ ] Переключить мобильное приложение на новый API
- [ ] Переключить Telegram-бота
- [ ] Мониторить и отлаживать

---

## 13. История обновлений

| Версия | Дата | Изменения |
|--------|------|----------|
| 2.0 | 29.04.2026 12:15 | ✅ АКТУАЛЬНАЯ. Учтены все договорённости: полный уход из Supabase, push для всех чатов, JWT auth, MySQL на Beget |
| 1.0 | 29.04.2026 11:00 | Первая версия (содержала смешение Supabase и Beget) |

---

**СТАТУС:** ✅ Готово к реализации. Это главная опорная архитектура для всех следующих сессий.

**Ссылка в следующих сессиях:** `TARGET_ARCHITECTURE.md` (версия 2.0)
