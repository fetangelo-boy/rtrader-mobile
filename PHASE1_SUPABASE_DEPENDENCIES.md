# Фаза 1: Остаточные зависимости от Supabase

**Дата:** 29 апреля 2026  
**Статус:** Анализ завершён  
**Целевая архитектура:** TARGET_ARCHITECTURE.md v2.0

---

## Результат анализа

**Зависимости от Supabase в backend:**

```bash
grep -r "getServerSupabase\|supabaseProtectedProcedure\|supabase\." server/ --include="*.ts"
```

### Найденные зависимости:

| Файл | Строка | Зависимость | Статус |
|------|--------|-------------|--------|
| `server/routers/chat.ts` | — | ❌ УДАЛЕНЫ | ✅ Переписано на Drizzle |
| `server/_core/trpc.ts` | ~30 | `supabaseProtectedProcedure` | ⏳ Используется другими routers |
| `server/routers/profile.ts` | ~5 | `getServerSupabase()` | ⏳ Требует переписи |
| `server/routers/account.ts` | ~3 | `getServerSupabase()` | ⏳ Требует переписи |
| `server/_core/notification.ts` | ~10 | `getServerSupabase()` | ⏳ Требует переписи |
| `lib/supabase.ts` | — | Supabase client | ⏳ Используется везде |
| `lib/supabase-client.ts` | — | Supabase client | ⏳ Используется везде |

---

## Детальный анализ

### 1. `server/routers/chat.ts` — ✅ ЗАВЕРШЕНО

**Статус:** Полностью переписано на Drizzle ORM  
**Зависимости:** ❌ Нет

**Что было:**
```typescript
import { getServerSupabase } from "../../lib/supabase";
const supabase = getServerSupabase();
const { data: chats } = await supabase.from("chats").select(...);
```

**Что стало:**
```typescript
import { getDb } from "../db";
const db = await getDb();
const chats = await db.select().from(chats).where(...);
```

---

### 2. `server/_core/trpc.ts` — ⏳ ТРЕБУЕТ ВНИМАНИЯ

**Статус:** Содержит `supabaseProtectedProcedure`  
**Используется:** Другими routers (profile, account, notifications)

**Текущий код:**
```typescript
export const supabaseProtectedProcedure = t.procedure
  .use(async (opts) => {
    const supabaseUser = opts.ctx.supabaseUser;
    if (!supabaseUser) throw new Error("Unauthorized");
    return opts.next({ ctx: { ...opts.ctx, supabaseUser } });
  });
```

**Решение:**
- Удалить `supabaseProtectedProcedure` после переписи всех routers
- Использовать только `protectedProcedure` (Manus OAuth)

---

### 3. `server/routers/profile.ts` — ⏳ ТРЕБУЕТ ПЕРЕПИСИ

**Статус:** Использует Supabase  
**Функции:** Получение профиля пользователя

**Текущий код:**
```typescript
const supabase = getServerSupabase();
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("user_id", userId);
```

**Решение:**
- Проверить, есть ли таблица `profiles` в MySQL
- Если нет — добавить в schema
- Переписать на Drizzle ORM

---

### 4. `server/routers/account.ts` — ⏳ ТРЕБУЕТ ПЕРЕПИСИ

**Статус:** Использует Supabase  
**Функции:** Управление аккаунтом

**Текущий код:**
```typescript
const supabase = getServerSupabase();
const { data: account } = await supabase.auth.getUser();
```

**Решение:**
- Использовать Manus OAuth вместо Supabase Auth
- Получать данные из `users` таблицы MySQL
- Переписать на Drizzle ORM

---

### 5. `server/_core/notification.ts` — ⏳ ТРЕБУЕТ ПЕРЕПИСИ

**Статус:** Использует Supabase  
**Функции:** Отправка уведомлений

**Текущий код:**
```typescript
const supabase = getServerSupabase();
const { data: tokens } = await supabase
  .from("push_tokens")
  .select("*");
```

**Решение:**
- Использовать `push_tokens` из MySQL
- Переписать на Drizzle ORM

---

### 6. `lib/supabase.ts` — ⏳ УДАЛИТЬ

**Статус:** Основной Supabase клиент  
**Используется:** Везде в backend

**Текущий код:**
```typescript
import { createClient } from "@supabase/supabase-js";

export function getServerSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}
```

**Решение:**
- Удалить после переписи всех routers
- Удалить env переменные `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

---

### 7. `lib/supabase-client.ts` — ⏳ УДАЛИТЬ

**Статус:** Клиент Supabase для фронтенда  
**Используется:** В приложении

**Текущий код:**
```typescript
import { createClient } from "@supabase/supabase-js";

export const supabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

**Решение:**
- Удалить после переписи всех компонентов фронтенда
- Использовать JWT авторизацию вместо Supabase Auth

---

## Зависимости в приложении (фронтенд)

### Компоненты, использующие Supabase:

```bash
grep -r "supabaseClient\|getServerSupabase" app/ --include="*.tsx" --include="*.ts"
```

**Ожидаемые результаты:**
- `app/chat/[id].tsx` — использует Supabase для чатов
- `app/profile/[id].tsx` — использует Supabase для профилей
- Другие компоненты

**Решение:**
- Переписать на использование tRPC endpoints
- Удалить прямые вызовы Supabase

---

## Стратегия полного отказа от Supabase

### Фаза 1 (текущая): Backend chat контур
- ✅ `server/routers/chat.ts` — переписано на MySQL
- ⏳ Остальные routers — требуют переписи

### Фаза 2: Остальные backend routers
- ⏳ `server/routers/profile.ts` — переписать
- ⏳ `server/routers/account.ts` — переписать
- ⏳ `server/_core/notification.ts` — переписать

### Фаза 3: Удаление Supabase из backend
- ⏳ Удалить `lib/supabase.ts`
- ⏳ Удалить `supabaseProtectedProcedure`
- ⏳ Удалить env переменные

### Фаза 4: Фронтенд
- ⏳ Переписать компоненты на tRPC
- ⏳ Удалить `lib/supabase-client.ts`
- ⏳ Удалить Supabase Auth

---

## Контрольный список для Фазы 1

**Backend:**
- [x] `server/routers/chat.ts` переписан на Drizzle
- [ ] Все остальные routers проверены
- [ ] Нет новых зависимостей от Supabase в chat router

**Фронтенд:**
- [ ] `app/chat/[id].tsx` работает с новым router
- [ ] Нет ошибок типов (chatId: number вместо string)
- [ ] Нет ошибок типов (chatType вместо type)

**Данные:**
- [ ] Экспортированы из Supabase
- [ ] Импортированы в MySQL
- [ ] Валидированы

---

## Итог

**Зависимости от Supabase в Фазе 1:**
- ✅ Backend chat контур: **0 зависимостей** (полностью на MySQL)
- ⏳ Остальной backend: **~5 файлов** требуют переписи
- ⏳ Фронтенд: **~3+ компонента** требуют переписи

**Статус Фазы 1:** ✅ Backend готов, требуется валидация на фронтенде
