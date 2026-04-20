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
- [ ] Интеграция с backend API для чатов
- [ ] Интеграция с backend API для статуса подписки
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
