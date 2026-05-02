# Expo Go Testing — Временное состояние (2026-05-02)

## ⚠️ ВАЖНЫЕ ПРАВИЛА

### 1. Отключённые плагины (ОБЯЗАТЕЛЬНЫ в production)
Текущее состояние `app.config.ts`:
```
newArchEnabled: false
```

**Отключены плагины:**
- ❌ `expo-audio` — обязателен в APK
- ❌ `expo-video` — обязателен в APK
- ❌ `expo-notifications` (с custom sounds) — обязателен в APK
- ❌ `expo-build-properties` — обязателен в APK
- ❌ React Compiler — отключен для стабильности

**ВОССТАНОВИТЬ В PRODUCTION:**
```ts
newArchEnabled: true
plugins: [
  "expo-router",
  "expo-notifications",
  ["expo-audio", { ... }],
  ["expo-video", { ... }],
  ["expo-splash-screen", { ... }],
  ["expo-notifications", { sounds: [...] }],
  ["expo-build-properties", { ... }],
]
experiments: {
  typedRoutes: true,
  reactCompiler: true,
}
```

### 2. Логические изменения ЗАПРЕЩЕНЫ
- ❌ Не менять код функций пока плагины отключены
- ❌ Не добавлять новые features
- ❌ Не менять UI/UX
- ✅ Только визуальное тестирование через Expo Go

### 3. Текущая ветка — ТОЛЬКО для Expo Go
- ✅ Сканировать QR код в Expo Go
- ✅ Проверить базовую функциональность
- ✅ Документировать баги/ошибки
- ❌ Не коммитить в main
- ❌ Не пушить в GitHub

### 4. Обязательные features в финальном APK
- ✅ Push notifications (expo-notifications)
- ✅ Audio playback (expo-audio)
- ✅ Video playback (expo-video)
- ✅ New Architecture (newArchEnabled: true)
- ✅ React Compiler (experiments.reactCompiler: true)

### 5. После теста — НЕМЕДЛЕННО восстановить

**Шаги:**
1. Вернуть все отключённые плагины в `app.config.ts`
2. Установить `newArchEnabled: true`
3. Включить React Compiler
4. Запустить `eas build --platform android --profile production`
5. Собрать финальный APK
6. Тестировать APK на реальном устройстве

---

## 📋 Чек-лист текущего теста

### Expo Go Testing Checklist
- [ ] Отсканирован QR код в Expo Go
- [ ] Приложение загружается без ошибок
- [ ] Нет "Something went wrong" синего экрана
- [ ] Вкладки работают (Чаты, Аккаунт)
- [ ] Авторизация работает
- [ ] Список чатов загружается
- [ ] Можно открыть чат и прочитать сообщения
- [ ] Можно отправить сообщение
- [ ] Кнопки на экране Аккаунта работают
- [ ] Выход (Logout) работает

### Документирование найденных багов
- [ ] Записать все найденные ошибки
- [ ] Скриншоты ошибок (если возможно)
- [ ] Шаги для воспроизведения

---

## 🔄 Восстановление production-конфигурации

**Файл:** `app.config.ts`

**Команда для восстановления:**
```bash
# 1. Вернуть все плагины
# 2. Установить newArchEnabled: true
# 3. Включить reactCompiler: true
# 4. Перезапустить dev server
npm run dev

# 5. Собрать финальный APK
eas build --platform android --profile production
```

---

## 🚨 ЗАПРЕЩЕНО

- ❌ Коммитить текущее состояние в main
- ❌ Пушить в GitHub
- ❌ Разрабатывать новые features
- ❌ Менять логику кода
- ❌ Использовать это состояние для production

---

## ✅ РАЗРЕШЕНО

- ✅ Сканировать QR код в Expo Go
- ✅ Тестировать базовую функциональность
- ✅ Документировать баги
- ✅ Делать скриншоты
- ✅ Проверять UI/UX

---

**Статус:** Временное состояние для Expo Go тестирования
**Дата создания:** 2026-05-02
**Срок действия:** До завершения Expo Go теста
**Следующий шаг:** Восстановить production-конфигурацию и собрать APK
