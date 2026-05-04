# Koyeb Migration Plan — RTrader Telegram Bot

**Дата:** 2026-05-04  
**Статус:** Подготовка к миграции  
**Причина:** Railway Trial нестабилен, токен бота "слетает" каждый день из-за перезагрузок  

---

## 1. Проблема с Railway

| Проблема | Причина | Следствие |
|---|---|---|
| Токен бота невалиден каждый день | Railway Trial перезагружается ночью | Бот падает, требует ручного обновления токена |
| Нестабильное управление env vars | Trial план имеет ограничения | Env переменные не сохраняются корректно после перезагрузки |
| Лимит памяти / CPU | Trial план ограничен | Автоматические перезагрузки при нагрузке |

**Вывод:** Railway Trial не подходит для production Telegram бота, требующего 24/7 стабильности.

---

## 2. Почему Koyeb?

| Параметр | Railway Trial | Koyeb Free | Преимущество |
|---|---|---|---|
| Стоимость | $5/месяц (Trial) | Бесплатно | ✅ Koyeb |
| Гарантия 24/7 | ❌ Перезагрузки | ✅ Гарантирована | ✅ Koyeb |
| Управление env vars | ⚠️ Нестабильно | ✅ Стабильно | ✅ Koyeb |
| Long-polling боты | ⚠️ Проблемы | ✅ Оптимизирован | ✅ Koyeb |
| Холодный старт | ~5 сек | ~2 сек | ✅ Koyeb |
| Поддержка Node.js | ✅ | ✅ | — |

**Koyeb** — идеален для long-polling Telegram ботов.

---

## 3. Архитектура миграции

### Текущее состояние (Railway)
```
GitHub repo (rtrader-mobile)
    ↓ (git push)
Railway (автоматический деплой)
    ↓ (запуск server/_core/index.ts)
Telegram Bot (@rtrader_mobapp_bot)
    ↓ (long polling)
Telegram API
```

### Целевое состояние (Koyeb)
```
GitHub repo (rtrader-mobile)
    ↓ (git push)
Koyeb (автоматический деплой)
    ↓ (запуск server/_core/index.ts)
Telegram Bot (@rtrader_mobapp_bot)
    ↓ (long polling)
Telegram API
```

**Отличие:** Только хостинг. Код, логика, env vars — идентичны.

---

## 4. Пошаговый план миграции

### Шаг 1: Подготовка Koyeb проекта (5 минут)

1. Зайти на [koyeb.com](https://koyeb.com)
2. Создать аккаунт или залогиниться
3. Создать новый Service:
   - **Name:** `rtrader-bot`
   - **Git Repository:** `https://github.com/fetangelo-boy/rtrader-mobile`
   - **Branch:** `main`
   - **Build Command:** `pnpm install && pnpm build`
   - **Run Command:** `NODE_ENV=production node dist/index.js`
   - **Port:** `3000`

### Шаг 2: Настройка Environment Variables (5 минут)

В Koyeb Dashboard → Service Settings → Environment Variables добавить:

```env
NODE_ENV=production
DISABLE_BOT=false

# Telegram Bot
BOT_TOKEN=8749763017:AAG4QfuYoTwC60zbSi-pxVnTjp-1eOLtDzY
TELEGRAM_BOT_TOKEN=8749763017:AAG4QfuYoTwC60zbSi-pxVnTjp-1eOLtDzY
ADMIN_IDS=716116024

# Supabase
SUPABASE_URL=https://vfxezndvkaxlimthkeyx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeGV6bmR2a2F4bGltdGhrZXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjcxODEsImV4cCI6MjA5MTk0MzE4MX0.Kt0v47bv258m-pOMymSY2PZeVxw7WI5yItE6wdxddCE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MySQL (legacy)
DATABASE_URL=mysql://user:pass@host/rtrader

# Manus OAuth
MANUS_API_BASE_URL=https://api.manus.im
MANUS_CLIENT_ID=...
MANUS_CLIENT_SECRET=...
```

### Шаг 3: Отключить Railway (5 минут)

1. Зайти в Railway Dashboard
2. Остановить сервис `rtrader-server`
3. Сохранить конфиг (на случай отката)

### Шаг 4: Обновить PROJECT_STATUS.md (5 минут)

Изменить в PROJECT_STATUS.md:

```diff
### Railway
- **Status** | ⚠️ Создан, но деплой НЕ завершён — бот работает в Manus sandbox
+ **Status** | ⚠️ ОТКЛЮЧЕН — мигрирован на Koyeb

### Koyeb (новое)
| Параметр | Значение |
|---|---|
| **Project Name** | rtrader-bot |
| **Service Name** | rtrader-bot |
| **Public URL** | https://rtrader-bot-xxxx.koyeb.app |
| **Status** | 🟢 Активен (long-polling) |
```

### Шаг 5: Мониторинг (5 минут)

1. Проверить логи Koyeb: `koyeb logs rtrader-bot`
2. Отправить тестовое сообщение боту
3. Проверить, что бот ответил
4. Убедиться, что токен не меняется 24 часа

---

## 5. Откат на Railway (если нужно)

Если Koyeb не работает:

1. Зайти в Railway Dashboard
2. Запустить сервис `rtrader-server`
3. Обновить BOT_TOKEN в Railway env vars
4. Проверить логи

---

## 6. Долгосрочное решение: Webhooks

После стабилизации на Koyeb можно перейти с long-polling на webhooks:

```
Telegram API
    ↓ (webhook POST)
Koyeb Service
    ↓ (обработка)
Supabase PostgreSQL
```

**Преимущества webhooks:**
- Нет постоянного подключения → меньше ресурсов
- Мгновенная доставка сообщений
- Более надёжно

**Реализация:** Добавить endpoint `POST /api/telegram-webhook` в `server/_core/index.ts`, зарегистрировать в Telegram BotFather.

---

## 7. Чек-лист миграции

- [ ] Создать Koyeb аккаунт
- [ ] Создать Service `rtrader-bot` в Koyeb
- [ ] Добавить все env vars в Koyeb
- [ ] Проверить, что бот запустился (логи)
- [ ] Отправить тестовое сообщение боту
- [ ] Убедиться, что токен стабилен 24 часа
- [ ] Остановить Railway сервис
- [ ] Обновить PROJECT_STATUS.md
- [ ] Удалить Railway проект (если не нужен для других сервисов)

---

## 8. Контакты и ссылки

| Ресурс | Ссылка |
|---|---|
| Koyeb Dashboard | https://app.koyeb.com |
| Railway Dashboard | https://railway.app |
| Telegram BotFather | https://t.me/BotFather |
| GitHub Repo | https://github.com/fetangelo-boy/rtrader-mobile |
| Supabase Project | https://app.supabase.com/project/vfxezndvkaxlimthkeyx |

---

## 9. Примечания

- **DISABLE_BOT=false** — убедиться, что установлено в Koyeb (в Manus sandbox это `true`)
- **Токен бота** — НЕ менять в BotFather, только в env vars
- **Логи** — проверять через Koyeb Dashboard, не через Railway
- **Откат** — если что-то пошло не так, Railway всё ещё работает (просто остановлен)
