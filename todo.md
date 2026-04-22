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
