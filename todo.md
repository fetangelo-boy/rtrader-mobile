# RTrader Mobile — TODO

## Full App (Original)
- [x] Сгенерировать логотип приложения (неоновый стиль, Москва/трейдинг)
- [x] Настроить цветовую тему (dark retro-wave, neon cyan/violet/pink)
- [x] Обновить app.config.ts с именем и логотипом
- [x] Настроить иконки для tab bar
- [x] Настроить Bottom Tab Bar (5 вкладок)
- [x] Экран "Ещё" (More) со списком дополнительных разделов
- [x] Home Screen: Hero, статистика, карусель, экосистема
- [x] Community Screen: описание, чаты, правила, ценности
- [x] Analytics Screen: торговые идеи, фильтры, уровни
- [x] Contests Screen: активные/предстоящие/завершённые турниры
- [x] More Screen: VIP, рефлексии, обучение, отзывы, об авторе, FAQ

## iOS MVP (Simplified)
- [x] Упрощение приложения (удаление карусели и лишних вкладок)
- [x] Создание 2 основных вкладок: Чаты и Аккаунт
- [x] Экран Чатов с 8 чатами (5 интерактивных + 3 информационных)
- [x] Экран отдельного чата с сообщениями
- [x] Функция Reply на сообщения
- [x] Управление уведомлениями (mute/unmute)
- [x] Экран Аккаунта с информацией о подписке
- [x] Статус подписки (active/expiring/expired/blocked)
- [x] Кнопки действий (Управление подпиской, Восстановить доступ, Поддержка, Выход)
- [x] Конфигурация EAS Build для iOS и Android
- [x] Логотип приложения в неоновом стиле

## Bug Fixes & Routing 🔧
- [x] Исправлена ошибка "Unmatched Route": упрощена схема deep linking с manus${timestamp} на rtrader
- [x] Добавлен маршрут chat/[id] в Stack конфигурацию
- [x] Исправлена схема deep linking в constants/oauth.ts (c manus${timestamp} на rtrader)
- [x] Запущена третья Android сборка (Build ID: 23d5d43d-9da6-4806-91f8-3b481fcf2a2b) с всеми исправлениями - ГОТОВА К УСТАНОВКЕ

## In Progress 🔄
- [x] Добавлены социальные сети (Telegram, VK, Dzen) на экран Аккаунта
- [x] Интеграция с backend API для чатов
- [x] Интеграция с backend API для статуса подписки
- [x] Исправлены структуры данных (profiles как объект, reply_to как массив)
- [x] Исправлены пустые имена авторов в сообщениях
- [x] Включена функция отправки сообщений по Enter
- [ ] Загрузка фото в чаты
- [ ] Push-уведомления

## Future Features 📋
- [ ] Поиск по чатам
- [ ] Архивирование чатов
- [ ] Пины сообщений
- [ ] Реакции на сообщения (emoji)
- [ ] Голосовые сообщения
- [ ] Видеозвонки
- [ ] Синхронизация с веб-приложением
- [ ] Синхронизация с Telegram

## Testing Checklist ✓
- [ ] Протестировать на iOS через Expo Go
- [ ] Протестировать на Android через Expo Go
- [ ] Протестировать сборку через EAS Build для iOS
- [ ] Протестировать сборку через EAS Build для Android
- [ ] Проверить работу всех кнопок навигации
- [ ] Проверить работу отправки сообщений
- [ ] Проверить работу reply функции
- [ ] Проверить работу mute/unmute
- [x] Создан app/index.tsx для обработки корневого маршрута (root route handler)
- [x] Обновлён app/_layout.tsx с initialRouteName="index"
- [x] Версия приложения обновлена 1.0.0 → 1.0.1 для пересчёта fingerprint
- [x] Финальная Android сборка (Build ID: a2ba32c8-30e2-4e28-a41f-6216ca3b935c) - Fingerprint: 8549379 - ГОТОВА К УСТАНОВКЕ

## Bug Fixes - FontFaceObserver 🐛
- [x] Удалена зависимость expo-font (вызывала ошибку FontFaceObserver timeout на Android)


## Supabase Backend Integration 🚀
- [x] Получить Supabase Access Token
- [x] Связать локальный проект с Supabase через CLI (supabase link)
- [x] Создать миграции для таблиц (profiles, chats, chat_participants, messages, chat_settings, subscriptions)
- [x] Добавить foreign keys и индексы в миграции
- [x] Применить миграции (supabase migration up)
- [x] Проверить, что все таблицы созданы в Supabase
- [x] Создать TRPC процедуры для чатов (chat.list, chat.getMessages, chat.sendMessage)
- [x] Создать TRPC процедуры для settings (chat.getSettings, chat.setMute)
- [x] Создать TRPC процедуру для подписки (account.getSubscription)
- [x] Email авторизация (регистрация, вход, выход, восстановление пароля)
- [x] Auth redirect логика (неавторизированный -> логин, авторизированный -> чаты)

## MVP Phase 🚀
- [ ] Обновить seed.sql с 8 реальными чатами (5 интерактивных + 3 инфо-канала)
- [ ] Добавить тип чата (interactive/info_only) в таблицу chats
- [ ] Добавить роль пользователя в chat_participants (participant/admin)
- [ ] Загружать список чатов из Supabase с визуальным индикатором mute
- [ ] Реализовать Reply функциональность с UI (долгое нажатие)
- [ ] Реализовать Mute/Unmute с UI и синхронизацией БД
- [ ] Реализовать прикрепление фото к сообщениям
- [ ] Обновить Account экран с реальным статусом подписки и кнопками действий
- [ ] Применить seed.sql через Supabase Dashboard
- [ ] Провести полный E2E тест (логин -> чаты -> сообщения -> reply -> фото -> mute -> аккаунт -> логаут)
- [ ] Исправить найденные баги
- [ ] Закоммитить все изменения в GitHub


## Backend Auth & Data Flow Fixes 🔴
- [x] Fix JOSEAlgNotAllowed - server JWT verification uses wrong algorithm/key
- [x] Fix tRPC context to correctly pass Supabase user to routers
- [x] Fix chats router to use supabaseUser instead of Manus user
- [x] Set up Supabase DB schema (chats, messages, profiles tables)
- [x] Seed test data (at least one chat for test@rtrader.com)
- [x] Test end-to-end: login → chats list → open chat

## Current Issue - Login Button Not Working ✅ RESOLVED
- [x] Настроить Supabase CLI для прямого доступа к БД
- [x] Проверить инициализацию Supabase Auth в приложении
- [x] Отладить login flow - выяснить, почему signInWithEmail не срабатывает
- [x] Проверить, работает ли web-specific button event handling
- [x] Проверить логи API сервера при клике на кнопку входа
- [x] Проверить, инициализирован ли Supabase клиент
- [x] Исправить проблему с обработчиком события кнопки
- [x] Протестировать login на web

## Android Smoke Test Bugs 🐛 (2026-04-23)
- [x] BUG: Только 7 из 12 чатов отображаются в списке (счётчик показывает 12)
- [x] BUG: Пустое поле "Пользователь" в каждом чате (имя автора не загружается)
- [x] BUG: Кнопка "Выход" (Logout) не работает на экране Аккаунта
- [x] BUG: Кнопка "Управление подпиской" не работает

## Profile Screen 👤
- [x] Экран профиля пользователя (просмотр и редактирование)
- [x] Отображение имени пользователя, email
- [x] Загрузка и отображение аватара (с инициалами как fallback)
- [x] Выбор фото из галереи (expo-image-picker)
- [x] Загрузка аватара на S3 через tRPC backend
- [x] Обновление имени пользователя через tRPC backend
- [x] Карточка профиля на экране Аккаунта (аватар + имя + email + кнопка "Изменить")

## Subscription Access System (Variant A) 🔐
- [x] Добавить поле telegram_id в user_metadata Supabase Auth
- [x] API-эндпоинт POST /api/admin/create-subscriber (для Telegram-бота)
- [x] API-эндпоинт POST /api/admin/renew-subscription (продление подписки)
- [x] API-эндпоинт POST /api/admin/reset-password (сброс пароля)
- [x] API-эндпоинт POST /api/admin/block-subscriber (блокировка)
- [x] API-эндпоинт GET /api/admin/subscriber-status (статус подписчика)
- [x] Защита admin API через ADMIN_API_KEY + X-Admin-Key заголовок
- [x] Проверка подписки при входе в чаты (useSubscriptionGuard)
- [x] Экран "Подписка истекла" с кнопкой перехода к боту
- [x] Vitest тест для валидации ADMIN_API_KEY
- [x] Документация API для Telegram-бота

## Subscription Request System MVP 🚀
- [x] Создать таблицу subscription_requests (MySQL/TiDB via Drizzle)
- [x] POST /api/requests/create — создание заявки (публичный)
- [x] POST /api/requests/upload-receipt — загрузка чека в S3 (публичный)
- [x] GET /api/admin/requests — список заявок (admin)
- [x] GET /api/admin/requests/:id — детали заявки (admin)
- [x] POST /api/admin/requests/:id/approve — одобрение + execute (admin)
- [x] POST /api/admin/requests/:id/reject — отклонение (admin)
- [x] Execute logic: различение нового vs существующего пользователя
- [x] Убрать кнопку "Зарегистрироваться" с экрана логина
- [x] Добавить "Получить доступ через Telegram" кнопку
- [x] Обновить signup.tsx → редирект на Telegram-бота
- [x] Обновить admin-api-docs.md с новым request flow
- [x] Исправить "Invalid Date" на экране Аккаунта (expires_at → current_period_end)
- [ ] Показывать статус заявки на экране Аккаунта
- [ ] Обновить subscription-expired с кнопками Telegram + Email

## Smartphone Smoke Test Feedback (2026-04-24)
- [x] FIX: После reply+send клавиатура закрывается
- [x] FIX: Reply state сбрасывается после отправки
- [x] FIX: После отправки сообщения автоскролл к новому сообщению
- [x] UPDATE: Telegram ссылка → https://t.me/RTrader11
- [x] UPDATE: VK ссылка → https://vk.com/RTrader11
- [x] UPDATE: Дзен заменить на Сайт → https://Rtrader11.ru
- [x] UPDATE: Служба поддержки → @rhodes4ever
- [x] UPDATE: Управление подпиской → ссылка на бот подписки
- [x] Подготовить тестовый скрипт для полного bot flow (create → approve → credentials → login)

## Admin Approve Date Fix (2026-04-24)
- [x] FIX: approve endpoint уже принимает точную дату (approved_until) — backend не менялся
- [x] Обновлён пример бота: FSM state для ручного ввода даты вместо пресетов
- [x] Обновлена API-документация с новым bot flow
- [x] Проверен create flow с точной датой 15.07.2026 — expires_at корректный

## Telegram Bot + Change Password (2026-04-24)
- [x] Создан полный Telegram-бот (bot/rtrader_bot.py) с FSM для ручного ввода даты
- [x] Убраны пресеты 30/90/180/365 — только ручной ввод ДД.ММ.ГГГГ
- [x] Валидация даты (формат + будущее)
- [x] Создан requirements.txt и README для бота
- [x] E2E тест: create → approve с точной датой → credentials → login (21/22 passed)
- [x] E2E тест: renew (продление) — is_new_user=false, expires_at обновлён
- [x] E2E тест: reject — отклонение заявки
- [x] Добавлена кнопка «Сменить пароль» на экран профиля
- [x] Форма смены пароля: новый пароль + подтверждение + show/hide + валидация
- [x] Интеграция с supabase.auth.updateUser для смены пароля

## Telegram Bot Deployment (2026-04-24)
- [x] Production-hardening бота (graceful shutdown, retry, timeouts, health check)
- [x] Dockerfile + docker-compose.yml
- [x] systemd unit file
- [x] Тест запуска бота в sandbox
- [x] Deployment guide (запуск / перезапуск / логи / обновление)

## Live Bot Deployment & E2E Test (2026-04-24)
- [x] Получить реальные credentials (BOT_TOKEN, ADMIN_CHAT_ID)
- [x] Запустить бота с реальными credentials
- [x] Проверить логи и стабильность
- [x] Провести живой e2e тест (чек → approve → credentials → login)

## Backend Fix (2026-04-24)
- [x] Fix: replace require("@supabase/supabase-js") with ESM import in lib/supabase.ts (production build crash)

## User Testing Feedback (2026-04-25)
- [x] Fix: чаты не отображались у нового пользователя (role member→participant, добавлен в 8 чатов вручную + фикс в коде)
- [x] UX: облегчить ввод credentials — deep link rtrader://login?email=...&password=... реализован
- [x] Investigate: @rtrader_vip_bot /start работает (обработчик есть, бот активен)
- [ ] APK ссылка для скачивания (после завершения Publish/Build)

## Bot Compatibility Diagnostic (2026-04-25)
- [x] Диагностика: работает ли бот для сайта rtrader11.ru/club
- [x] Сравнение flow сайта и приложения
- [x] Определить root cause если сломано
- [x] Предложить минимальный фикс без поломки app flow

## Architecture Analysis (2026-04-25)
- [x] Изучить репозиторий сайта rtrader-hub
- [x] Сопоставить архитектуры сайта и приложения
- [x] Архитектурный отчёт: единый backend
- [x] Создать отдельного бота для регистрации в приложение (@rtrader_mobapp_bot)

## Bot Split: Site vs App (2026-04-25)
- [x] Switch rtrader_bot.py to new token (@rtrader_mobapp_bot)
- [x] Restore webhook for @rtrader_vip_bot (site)
- [x] Update bot links in mobile app (profile, account, login, signup, subscription-expired)
- [x] Restart new bot and verify polling works
- [x] Verify site bot webhook is active

## Subscription Button + UI Polish (2026-04-25) ✅ VERIFIED
- [x] Fix: "Управление подпиской" opens bot description instead of chat → URL changed to ?start=renew
- [x] Add /start renew handler to bot for subscription renewal flow
- [x] Polish account screen buttons (StyleSheet.create, consistent sizing, shadow, press feedback)
- [x] E2E test: button → bot → receipt → admin approve → credentials → subscriber (PASSED)

## Test Accounts for iPhone Testers (2026-04-25)
- [x] Create tester1@rtrader.com with subscription until 2036-01-01 via admin API
- [x] Create tester2@rtrader.com with subscription until 2036-01-01 via admin API
- [x] Create tester3@rtrader.com with subscription until 2036-01-01 via admin API
- [x] Generate deep links for all 3 accounts (exp:// scheme for Expo Go)
- [x] Write updated tester instructions with auto-login deep links (TESTER_IPHONE_INSTRUCTIONS.txt)
- [x] Updated admin.ts: renew-subscription and reset-password now accept email + exact approved_until date

## Android Release Preparation (2026-04-28)
- [ ] Check bot @rtrader_mobapp_bot deployment status (sandbox vs production)
- [x] Implement admin-only info chats UI (hide input for non-admins in info_only chats)
- [x] Apply RLS migration 20260428190000_allow_admin_post_info_only.sql via Supabase SQL Editor
- [x] Update requests.ts to assign 'subscriber' role for info_only chats on approval
- [x] Update chat.ts sendMessage to check chat type and user role
- [x] Update getChatInfo to return userRole for the current user
- [ ] Implement push notifications for subscribers (new messages, subscription events)
- [ ] Research free/cheap VPS in Russia for bot + RF-circuit deployment
- [ ] Final pre-release verification
- [ ] Save checkpoint and Publish APK

## Russian Backend Hosting (2026-04-28)
- [ ] Research Beget VPS/cloud for Node.js + PostgreSQL
- [ ] Compare alternatives (Timeweb, Selectel, REG.RU)
- [ ] Evaluate free/cheap tiers for initial launch
- [ ] Prepare migration plan from Supabase to Russian backend
- [ ] Deploy backend + bot + PostgreSQL on Russian server


## Media Uploads in Chats (2026-04-29)
- [ ] Add `media_url` field to `messages` table (Supabase)
- [ ] Create `chat.uploadMedia` endpoint for S3 upload
- [ ] Add RLS policy: admins can upload to info_only, participants to interactive
- [ ] Add UI button "📎 Прикрепить" in chat screen
- [ ] Display media (photos/videos) in message list
- [ ] Handle media preview + download

## Push Notifications - Broadcast Endpoint (2026-04-29)
- [ ] Create `notifications.sendBatch` endpoint (admin-only)
- [ ] Integrate Expo Push API for sending notifications
- [ ] Support sending to: all subscribers, specific chat, specific role
- [ ] Implement notification payload: title, body, data (chatId, screen)
- [ ] Add filtering: exclude users who disabled notifications
- [ ] Test end-to-end: send → receive on device

## Migration Plan: Supabase → Beget VPS (2026-04-29)
- [ ] Confirm backend stack: Node.js + Express + MySQL (Drizzle ORM)
- [ ] Verify Beget VPS specifications (1 core, 1GB RAM, 10GB NVMe, ~480₽/мес)
- [ ] Plan data migration: export Supabase → import MySQL on Beget
- [ ] Design unified database schema (users, subscriptions, chats, messages)
- [ ] Plan zero-sync architecture: no ongoing Supabase dependency
- [ ] Create deployment guide for Beget (Docker/PM2, Nginx, SSL)
- [ ] Plan cutover strategy: switch API endpoints → new backend
