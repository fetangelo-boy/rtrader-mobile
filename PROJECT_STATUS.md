# RTrader Mobile — Статус проекта
> Последнее обновление: **2026-05-04 (сессия 3)**
> Этот файл — единственный источник правды о состоянии проекта.

---

## 1. Идентификаторы и ключевые URL

| Параметр | Значение |
|---|---|
| **Приложение** | RTrader (Трейдинговый Супер-Портал) |
| **Платформа** | React Native / Expo SDK 54 |
| **Deep Link схема** | `rtrader://` |
| **GitHub репо** | `fetangelo-boy/rtrader-mobile` |
| **Manus Dev URL** | `https://8081-iqbo82wz5ez3zf6ocn4av-401261bf.us2.manus.computer` |
| **Последний чекпоинт** | `b8cafd77` (2026-05-03) |

### Supabase
| Параметр | Значение |
|---|---|
| **Project ID** | `vfxezndvkaxlimthkeyx` |
| **URL** | `https://vfxezndvkaxlimthkeyx.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeGV6bmR2a2F4bGltdGhrZXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjcxODEsImV4cCI6MjA5MTk0MzE4MX0.Kt0v47bv258m-pOMymSY2PZeVxw7WI5yItE6wdxddCE` |

### Railway (API-сервер, бот отключён)
| Параметр | Значение |
|---|---|
| **Public URL** | `https://rtrader-server-production.up.railway.app` |
| **DISABLE_BOT** | `true` — long-polling полностью отключён |
| **Роль** | Только tRPC API-сервер. Бот НЕ запускается. |
| **Статус** | ✅ Работает. Скоро будет выведен из эксплуатации. |

### Telegram Bot
| Параметр | Значение |
|---|---|
| **Username** | `@rtrader_mobapp_bot` |
| **Token** | `8749763017:AAG4QfuYoTwC60zbSi-pxVnTjp-1eOLtDzY` (актуальный на 2026-05-04) |
| **Admin Telegram ID** | `716116024` (числовой) + `rhodes4ever` (username) |
| **Режим работы** | **Webhook** → Supabase Edge Function (PROFITKING паттерн) |
| **Webhook URL** | `https://vfxezndvkaxlimthkeyx.supabase.co/functions/v1/telegram-webhook` |
| **Webhook Secret** | `rtrader_webhook_secret_2024` |
| **Статус** | ✅ Работает 24/7 через Supabase Edge Function. Long-polling ОТКЛЮЧЁН. |

---

## 2. Архитектура (PROFITKING-паттерн — ДОСТИГНУТ)

```
Telegram Bot (@rtrader_mobapp_bot)
    ↓ Webhook (24/7, без засыпания)
Supabase Edge Function (telegram-webhook)
    ↓ команды бота + посты канала
Supabase PostgreSQL (единственная БД)
    ↓ Realtime
Mobile App (React Native / Expo)
```

**Railway** — временный API-сервер (tRPC). Будет выведен из эксплуатации после того, как все клиенты переедут на прямые Supabase-вызовы.

**MySQL** — полностью выведен из активных роутеров. Drizzle-схема осталась как legacy-код, но ни один активный роутер её не использует.

---

## 3. Экраны приложения

| Экран | Файл | Статус |
|---|---|---|
| Splash / Redirect | `app/index.tsx` | ✅ |
| Логин | `app/auth/login.tsx` | ✅ Supabase direct auth |
| Логин (web) | `app/auth/login.web.tsx` | ✅ |
| Регистрация | `app/auth/signup.tsx` | ✅ |
| Забыл пароль | `app/auth/forgot-password.tsx` | ✅ |
| Telegram авто-логин | `app/auth/telegram.tsx` | ✅ Deep link one-time token |
| Список чатов | `app/(tabs)/chats.tsx` | ✅ tRPC → Supabase |
| Чат (детальный) | `app/chat/[id].tsx` | ✅ Supabase Realtime + медиа |
| Аккаунт | `app/(tabs)/account.tsx` | ✅ Подписка из Supabase |
| Профиль | `app/profile.tsx` | ✅ |

---

## 4. База данных — Supabase PostgreSQL (единственная)

| Таблица | Назначение | RLS | Realtime |
|---|---|---|---|
| `profiles` | Профили пользователей | ✅ | — |
| `chats` | Список чатов | ✅ | — |
| `chat_participants` | Участники чатов | ✅ | — |
| `messages` | Сообщения в чатах | ✅ | ✅ |
| `chat_settings` | Настройки чатов | ✅ | — |
| `subscriptions` | Подписки пользователей | ✅ | — |
| `push_tokens` | Токены push-уведомлений | ✅ | — |
| `posts` | Посты из Telegram-каналов | ✅ | ✅ |

**MySQL** — больше не используется активными роутерами. Drizzle-схема сохранена как исторический артефакт.

---

## 5. Серверные роутеры — статус миграции

| Файл | БД | Статус |
|---|---|---|
| `server/routers/chat.ts` | **Supabase** | ✅ Полностью мигрирован |
| `server/routers/auth.ts` | **Supabase Auth** | ✅ Полностью мигрирован |
| `server/routers/admin.ts` | **Supabase** | ✅ Полностью мигрирован |
| `server/routers/subscriptions.ts` | **Supabase** | ✅ Полностью мигрирован |
| `server/routers/account.ts` | **Supabase** | ✅ |
| `server/routers/admin-trpc.ts` | MySQL (legacy) | ⚠️ Не используется мобильным приложением |
| `server/routers/requests.ts` | MySQL (legacy) | ⚠️ Не используется мобильным приложением |

---

## 6. Supabase Edge Functions

| Функция | Статус | Назначение |
|---|---|---|
| `telegram-webhook` | ✅ Задеплоена, работает | Принимает все апдейты бота: команды, кнопки, посты канала |
| `media-proxy` | ✅ Задеплоена | Конвертирует Telegram `file_id` → временная ссылка |

**Secrets в Supabase Edge Functions (точные имена — с префиксом TELEGRAM_):**
- `TELEGRAM_BOT_TOKEN` = `8749763017:AAG4QfuYoTwC60zbSi-pxVnTjp-1eOLtDzY`
- `TELEGRAM_WEBHOOK_SECRET` = `rtrader_webhook_secret_2024`
- `ADMIN_IDS` = `716116024`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — auto-injected Supabase

⚠️ ВАЖНО: имена именно `TELEGRAM_BOT_TOKEN` и `TELEGRAM_WEBHOOK_SECRET` — с префиксом. Не `BOT_TOKEN`, не `WEBHOOK_SECRET`.

---

## 7. Telegram Bot — флоу и команды

**Флоу подписки (через Edge Function):**
1. `/start` → меню тарифов
2. Выбор тарифа → реквизиты оплаты
3. Пользователь отправляет чек → уведомление администратору
4. Администратор: `/approve <telegram_id> <дни>` → создаёт аккаунт в Supabase Auth
5. Бот отправляет deep link `rtrader://login?email=...&password=...`

**Тарифы (статические в Edge Function):**
- 7 дней — 990 ₽
- 30 дней — 2 990 ₽
- 90 дней — 7 990 ₽

**Реквизиты оплаты:** T-Bank, карта 5536 9138 8189 0954, Зерянский Роман Олегович

**Команды администратора:**
- `/approve <telegram_id> [дни]` — одобрить, создать аккаунт
- `/reject <telegram_id>` — отклонить
- `/status <telegram_id>` — проверить статус подписки

---

## 8. Хронология — что сделано

### Сессия 2026-05-04 (сессия 1)
- [x] Обнаружен конфликт webhook + long-polling — корневая причина ежедневных сбоев токена
- [x] Webhook удалён, затем пересоздан правильно
- [x] Edge Function `telegram-webhook` переписана и задеплоена
- [x] `DISABLE_BOT=true` установлен на Railway — long-polling отключён навсегда
- [x] PROFITKING-паттерн достигнут: бот работает через Supabase Edge Function 24/7

### Сессия 2026-05-04 (сессия 2)
- [x] `server/routers/chat.ts` — полностью переписан на Supabase (убран MySQL)
- [x] `server/routers/auth.ts` — убран MySQL `auth_users`, только Supabase Auth
- [x] `server/routers/admin.ts` — убран MySQL `chat_participants`, только Supabase
- [x] `server/routers/subscriptions.ts` — полностью переписан на Supabase
- [x] TypeScript: 0 ошибок после всех изменений
- [x] Запушено на GitHub (commit `651465e`)
- [x] Новый токен бота `AAG4QfuYoTwC60zbSi-pxVnTjp-1eOLtDzY` установлен в Supabase secrets
- [x] Webhook пересоздан с новым токеном — работает без ошибок

### Сессия 2026-05-04 (сессия 3)
- [x] Исправлены имена secrets: `TELEGRAM_BOT_TOKEN` и `TELEGRAM_WEBHOOK_SECRET` (с префиксом)
- [x] `pendingPayments` перенесён из in-memory Map в Supabase таблицу `pending_payments`
- [x] Edge Function: `/approve` работает напрямую через Supabase Auth Admin API (Railway не вызывается)
- [x] Проверен полный флоу: /start → тариф → pending_payments → /approve → подписка → deep link
- [x] Запушено на GitHub (commit `b4d1926`)

---

## 9. Что осталось сделать

### Следующий приоритет
- [ ] Добавить бота `@rtrader_mobapp_bot` в VIP Telegram-канал как администратора
- [ ] Проверить, что посты из канала появляются в таблице `posts` через Edge Function
- [ ] Создать экран ленты постов в приложении

### Технический долг (не блокирует работу)
- [ ] Удалить legacy-роутеры `admin-trpc.ts` и `requests.ts` (MySQL, не используются)
- [ ] Вывести Railway из эксплуатации (после перехода всех клиентов на прямой Supabase)
- [ ] SaleBot интеграция (автоматическая проверка банковских переводов)
- [ ] Push-уведомления: тестирование на реальном устройстве

---

## 10. Известные проблемы

| Проблема | Статус |
|---|---|
| Токен бота слетал каждый день | ✅ РЕШЕНО — конфликт webhook+polling устранён |
| MySQL дублировал Supabase | ✅ РЕШЕНО — активные роутеры переведены на Supabase |
| Edge Function не была задеплоена | ✅ РЕШЕНО — задеплоена и работает |
| Long-polling на Railway | ✅ РЕШЕНО — DISABLE_BOT=true |
| pendingPayments терялись (in-memory) | ✅ РЕШЕНО — хранятся в Supabase `pending_payments` |
| /approve вызывал Railway | ✅ РЕШЕНО — напрямую через Supabase Auth Admin API |
| Неверные имена secrets в Edge Function | ✅ РЕШЕНО — TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET |
