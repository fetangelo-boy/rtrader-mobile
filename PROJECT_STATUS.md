# RTrader Mobile — Статус проекта
> Последнее обновление: 2026-05-04  
> Этот файл — единственный источник правды о состоянии проекта. Обновлять при каждом значимом изменении.

---

## 1. Идентификаторы и ключевые URL

| Параметр | Значение |
|---|---|
| **Приложение** | RTrader (Трейдинговый Супер-Портал) |
| **Платформа** | React Native / Expo SDK 54 |
| **Deep Link схема** | `rtrader://` |
| **GitHub репо** | `fetangelo-boy/rtrader-mobile` |
| **Manus Dev URL** | `https://8081-iqbo82wz5ez3zf6ocn4av-401261bf.us2.manus.computer` |
| **Manus API URL** | `http://127.0.0.1:3000` (внутри sandbox) |
| **Последний чекпоинт** | `b8cafd77` (2026-05-03) |

### Supabase
| Параметр | Значение |
|---|---|
| **Project ID** | `vfxezndvkaxlimthkeyx` |
| **URL** | `https://vfxezndvkaxlimthkeyx.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeGV6bmR2a2F4bGltdGhrZXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjcxODEsImV4cCI6MjA5MTk0MzE4MX0.Kt0v47bv258m-pOMymSY2PZeVxw7WI5yItE6wdxddCE` |

### Railway
| Параметр | Значение |
|---|---|
| **Project Name** | `rtrader-backend` |
| **Service Name** | `rtrader-server` |
| **Public URL** | `https://rtrader-server-production.up.railway.app` |
| **Project ID** | `89010a7e-14a3-4758-8f58-efe4bdf3beba` |
| **Service ID** | `90c6b008-d42c-48eb-8bb1-1c58d366a4f8` |
| **Account** | `fetangelo@gmail.com` (Dmitriy) |
| **Plan** | Trial (29 дней осталось на 2026-05-03) |
| **DISABLE_BOT** | `true` — long-polling отключён, бот работает через webhook |
| **Status** | ✅ Работает. Бот НЕ запускает long-polling (DISABLE_BOT=true) |

### Telegram Bot
| Параметр | Значение |
|---|---|
| **Username** | `@rtrader_mobapp_bot` |
| **Admin Telegram ID** | `716116024` (числовой) + `rhodes4ever` (username) |
| **Режим работы** | **Webhook** → Supabase Edge Function (PROFITKING паттерн) |
| **Webhook URL** | `https://vfxezndvkaxlimthkeyx.supabase.co/functions/v1/telegram-webhook` |
| **Webhook Secret** | `rtrader_webhook_secret_2026` |
| **Статус** | ✅ Работает 24/7 через Supabase Edge Function. Long-polling ОТКЛЮЧЁН. |

---

## 2. Архитектура (целевая — PROFITKING-паттерн)

```
Telegram Bot (@rtrader_mobapp_bot)
    ↓ Webhook (PROFITKING паттерн)
Supabase Edge Function (telegram-webhook)
    ↓ команды бота + посты канала
Supabase PostgreSQL (основная БД)
    ↓ Realtime
Mobile App (React Native / Expo)

Railway Express Server (API only, DISABLE_BOT=true)
    ↓ tRPC + REST + approve-subscription endpoint
Supabase PostgreSQL
```

**Принцип:** Supabase-first. MySQL используется как legacy-слой для чатов/подписок (технический долг, не блокирует работу).

---

## 3. Экраны приложения

| Экран | Файл | Статус |
|---|---|---|
| Splash / Redirect | `app/index.tsx` | ✅ Готов |
| Логин | `app/auth/login.tsx` | ✅ Supabase direct auth |
| Логин (web) | `app/auth/login.web.tsx` | ✅ |
| Регистрация | `app/auth/signup.tsx` | ✅ |
| Забыл пароль | `app/auth/forgot-password.tsx` | ✅ |
| Telegram авто-логин | `app/auth/telegram.tsx` | ✅ Deep link one-time token |
| OAuth callback | `app/oauth/` | ✅ |
| Список чатов | `app/(tabs)/chats.tsx` | ✅ |
| Чат (детальный) | `app/chat/[id].tsx` | ✅ Supabase Realtime, медиа-рендеринг |
| Аккаунт | `app/(tabs)/account.tsx` | ✅ Подписка, статус, кнопки |
| Профиль | `app/profile.tsx` | ✅ |
| Dev-инструменты | `app/dev/` | ✅ (только для разработки) |

**Навигация:** 2 таба — Чаты (`chats.fill`) и Аккаунт (`person.fill`)

---

## 4. База данных

### Supabase PostgreSQL (основная БД)

| Таблица | Назначение | RLS | Realtime |
|---|---|---|---|
| `profiles` | Профили пользователей | ✅ | — |
| `chats` | Список чатов (14 чатов) | ✅ | — |
| `chat_participants` | Участники чатов | ✅ | — |
| `messages` | Сообщения в чатах | ✅ | ✅ |
| `chat_settings` | Настройки чатов | ✅ | — |
| `subscriptions` | Подписки пользователей | ✅ | — |
| `push_tokens` | Токены push-уведомлений | ✅ | — |
| `posts` | Посты из каналов (лента контента) | ✅ | ✅ |

**Миграции:** `supabase/migrations/` — 10 файлов, все применены.

### MySQL / Drizzle ORM (legacy-слой, технический долг)

| Таблица | Назначение |
|---|---|
| `users` | Пользователи |
| `chats` | Чаты (дублирует Supabase) |
| `messages` | Сообщения (дублирует Supabase) |
| `chat_participants` | Участники |
| `subscriptions` | Подписки |
| `subscription_requests` | Заявки на подписку |
| `subscription_plans` | Тарифные планы |
| `payment_details` | Реквизиты оплаты |
| `push_tokens` | Push токены |
| `one_time_login_tokens` | Одноразовые токены входа |
| `auth_users` | Авторизационные данные |

> ⚠️ **Технический долг:** MySQL-слой работает параллельно с Supabase. Полная миграция на Supabase — задача после релиза.

---

## 5. Серверные роутеры (tRPC + REST)

| Файл | Назначение |
|---|---|
| `server/routers/auth.ts` | Регистрация, логин, one-time token |
| `server/routers/chat.ts` | Список чатов, сообщения, отправка |
| `server/routers/account.ts` | Данные аккаунта |
| `server/routers/profile.ts` | Профиль пользователя |
| `server/routers/subscriptions.ts` | Тарифные планы, заявки |
| `server/routers/admin.ts` | REST API для администратора |
| `server/routers/admin-trpc.ts` | tRPC процедуры для администратора |
| `server/routers/notifications.ts` | Push-уведомления |
| `server/routers/requests.ts` | Заявки на подписку |
| `server/routers/uploads.ts` | Загрузка файлов |
| `server/routers/protected-subscription.ts` | Защищённый контент |
| `server/routers/telegram-bot.ts` | Инициализация и обработка бота |

---

## 6. Telegram Bot — команды и флоу

**Флоу подписки:**
1. Пользователь пишет `/start` боту
2. Бот показывает меню тарифов (из MySQL `subscription_plans`)
3. Пользователь выбирает тариф → бот присылает реквизиты оплаты
4. Пользователь отправляет чек → бот уведомляет администратора
5. Администратор нажимает `/approve_<requestId>` → бот создаёт аккаунт в Supabase
6. Бот отправляет пользователю deep link `rtrader://login?token=...` для авто-входа

**Тарифы (из MySQL `subscription_plans`):**
- 1 месяц — 1 700 ₽
- 3 месяца — 4 000 ₽
- 6 месяцев — 10 300 ₽
- 12 месяцев — 20 000 ₽

**Реквизиты оплаты:** T-Bank, карта 5536 9138 8189 0954, Зерянский Роман Олегович

**Команды администратора:**
- `/approve_<requestId>` — одобрить заявку, создать аккаунт, отправить credentials
- `/reject_<requestId>` — отклонить заявку

---

## 7. Supabase Edge Functions

| Функция | Файл | Статус | Назначение |
|---|---|---|---|
| `telegram-webhook` | `supabase/functions/telegram-webhook/` | ✅ Написана | Принимает посты из Telegram-канала → сохраняет в `posts` |
| `media-proxy` | `supabase/functions/media-proxy/` | ✅ Написана | Конвертирует Telegram `file_id` → временная ссылка на медиа |

> ⚠️ **Обе функции НЕ задеплоены** — ждут добавления бота в Telegram-канал (запланировано на ночь).

---

## 8. Push-уведомления

| Компонент | Статус |
|---|---|
| `hooks/use-push-notifications.ts` | ✅ Написан |
| Регистрация токена в Supabase `push_tokens` | ✅ Реализована |
| Отправка уведомлений через Expo Push API | ✅ Реализована в `notifications.ts` |
| Тестирование на реальном устройстве | ⬜ Не тестировалось |

---

## 9. Что сделано — хронология

### Фаза 1: Базовое приложение
- [x] Инициализация Expo проекта с NativeWind, TypeScript, Expo Router
- [x] Dark Retro-Wave тема (неон: cyan/violet/pink)
- [x] Кастомный логотип приложения
- [x] Навигация: 2 таба (Чаты, Аккаунт)
- [x] Экраны: список чатов, детальный чат, аккаунт

### Фаза 2: Аутентификация и подписки
- [x] Supabase Auth (email+password)
- [x] Экраны логина, регистрации, восстановления пароля
- [x] One-time token для авто-логина через Telegram deep link
- [x] Защита экранов подпиской (`use-subscription-guard.ts`)
- [x] Экран истёкшей подписки

### Фаза 3: Telegram Bot
- [x] Бот `@rtrader_mobapp_bot` — long polling режим
- [x] Флоу регистрации: тариф → оплата → чек → одобрение → credentials
- [x] Тарифы из MySQL (1700/4000/10300/20000 ₽)
- [x] Deep link авто-логин после одобрения
- [x] Admin команды: `/approve_<id>`, `/reject_<id>`
- [x] ADMIN_IDS: `716116024` (числовой ID)

### Фаза 4: Supabase интеграция
- [x] Supabase PostgreSQL: 8 таблиц + миграции
- [x] RLS политики для всех таблиц
- [x] Supabase Realtime для `messages` и `posts`
- [x] Push tokens в Supabase
- [x] Таблица `posts` — универсальная основа для ленты контента VIP-клуба

### Фаза 5: Realtime чаты и медиа (2026-05-03)
- [x] Заменён polling (8с) на Supabase Realtime в `app/chat/[id].tsx`
- [x] Медиа-рендеринг в сообщениях: фото инлайн, видео placeholder
- [x] Удалены устаревшие архитектурные документы (Beget/MySQL-first)

### Фаза 6: Подготовка к деплою Railway
- [x] Добавлен endpoint `POST /api/admin/approve-subscription` в `admin.ts`
- [x] Написан `Dockerfile` для Railway
- [x] Railway проект `rtrader-backend` создан (Trial, 29 дней)
- [ ] **Деплой бота на Railway — В ПРОЦЕССЕ** (проблема с Railway CLI токеном)

---

## 10. Что осталось сделать

### Критично для продакшена
- [ ] **Завершить деплой бота на Railway** (текущая задача)
- [ ] Добавить бота в Telegram-канал как администратора (ночью)
- [ ] Задеплоить Edge Functions `telegram-webhook` и `media-proxy` в Supabase

### После деплоя
- [ ] Подключить `telegram-webhook` → таблица `posts` (посты из канала)
- [ ] Создать экран ленты постов (когда нужна конкретная реализация)
- [ ] Заменить polling в `app/(tabs)/chats.tsx` на Supabase Realtime

### Технический долг
- [ ] Миграция MySQL → Supabase PostgreSQL (чаты, подписки, пользователи)
- [ ] SaleBot интеграция (автоматическая проверка банковских переводов)
- [ ] Тестирование push-уведомлений на реальном устройстве

---

## 11. Ключевые файлы для навигации

```
app/
  (tabs)/
    chats.tsx          ← Список чатов
    account.tsx        ← Аккаунт и подписка
    _layout.tsx        ← Конфигурация табов
  chat/[id].tsx        ← Детальный чат (Realtime)
  auth/login.tsx       ← Логин (Supabase direct)
  auth/telegram.tsx    ← Авто-логин по deep link

server/
  telegram/
    bot-handler.ts     ← Весь код Telegram бота
    index.ts           ← Инициализация бота
  routers/
    admin.ts           ← REST API для администратора
    chat.ts            ← tRPC чаты и сообщения

supabase/
  migrations/          ← 10 SQL миграций (все применены)
  functions/
    telegram-webhook/  ← Edge Function (не задеплоена)
    media-proxy/       ← Edge Function (не задеплоена)

drizzle/
  schema.ts            ← MySQL таблицы (legacy)
  schema_subscriptions.ts ← Тарифы, заявки, оплата

lib/
  config.ts            ← Supabase URL и anon key
  supabase-client.ts   ← Supabase JS клиент
  supabase-auth.ts     ← Управление сессией Supabase

hooks/
  use-auth.ts          ← Состояние авторизации
  use-subscription-guard.ts ← Защита экранов подпиской
  use-push-notifications.ts ← Push-уведомления
```

---

## 12. Известные проблемы

| Проблема | Статус | Решение |
|---|---|---|
| Бот работает в Manus sandbox (засыпает) | ⚠️ В процессе | Деплой на Railway |
| MySQL-слой дублирует Supabase | ⚠️ Технический долг | Миграция после релиза |
| Edge Functions не задеплоены | ⬜ Ждёт бота в канале | После ночи |
| Railway CLI токен не работает через env | ⚠️ Решается | Используем API напрямую |
