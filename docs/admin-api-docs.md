# RTrader Admin API — Документация для Telegram-бота

## Обзор

Admin API предоставляет эндпоинты для управления подписчиками из Telegram-бота. Все запросы защищены ключом `ADMIN_API_KEY`, который передаётся в заголовке `X-Admin-Key`.

## Базовый URL

После публикации приложения URL будет:

```
https://<ваш-домен>/api/admin/
```

## Аутентификация

Каждый запрос к Admin API **обязан** содержать заголовок:

```
X-Admin-Key: NJR_Q_GyzcVLT752eXPPOpQaOYginB5sRUcLkvdzqmhPdZzFQmwmsnJri-r1-fkn
```

Без этого заголовка или с неверным ключом сервер вернёт `401 Unauthorized`.

---

## Эндпоинты

### 1. Создание подписчика

**`POST /api/admin/create-subscriber`**

Вызывается после подтверждения оплаты в Telegram-боте. Создаёт аккаунт пользователя, профиль и подписку.

**Тело запроса (JSON):**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `telegram_id` | string | Да | Telegram user ID |
| `telegram_name` | string | Да | Имя пользователя из Telegram |
| `email` | string | Нет | Email (если не указан, генерируется `tg{telegram_id}@rtrader.app`) |
| `plan` | string | Нет | Тарифный план (по умолчанию `"premium"`) |
| `days` | number | Нет | Срок подписки в днях (по умолчанию `30`) |

**Пример запроса:**

```bash
curl -X POST https://<домен>/api/admin/create-subscriber \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: NJR_Q_GyzcVLT752eXPPOpQaOYginB5sRUcLkvdzqmhPdZzFQmwmsnJri-r1-fkn" \
  -d '{
    "telegram_id": "123456789",
    "telegram_name": "Иван Петров",
    "plan": "premium",
    "days": 30
  }'
```

**Успешный ответ (200):**

```json
{
  "success": true,
  "user_id": "uuid-строка",
  "email": "tg123456789@rtrader.app",
  "password": "Xk9mP2qR4v",
  "telegram_id": "123456789",
  "subscription": {
    "id": "sub-abc12345",
    "plan": "premium",
    "status": "active",
    "started_at": "2026-04-24T10:00:00.000Z",
    "expires_at": "2026-05-24T10:00:00.000Z"
  }
}
```

**Ошибки:**

| Код | Описание |
|-----|----------|
| 400 | `telegram_id` или `telegram_name` не указаны |
| 409 | Пользователь с таким `telegram_id` или `email` уже существует |
| 500 | Внутренняя ошибка сервера |

**Что делать с ответом:** Бот отправляет пользователю `email` и `password` в Telegram-сообщении.

---

### 2. Продление подписки

**`POST /api/admin/renew-subscription`**

Продлевает подписку. Если подписка активна — дни добавляются к текущей дате окончания. Если истекла — отсчёт от текущего момента.

**Тело запроса (JSON):**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `telegram_id` | string | Да | Telegram user ID |
| `days` | number | Нет | Дней для продления (по умолчанию `30`) |
| `plan` | string | Нет | Новый тарифный план |

**Пример запроса:**

```bash
curl -X POST https://<домен>/api/admin/renew-subscription \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: NJR_Q_GyzcVLT752eXPPOpQaOYginB5sRUcLkvdzqmhPdZzFQmwmsnJri-r1-fkn" \
  -d '{
    "telegram_id": "123456789",
    "days": 30
  }'
```

**Успешный ответ (200):**

```json
{
  "success": true,
  "user_id": "uuid-строка",
  "email": "tg123456789@rtrader.app",
  "subscription": {
    "id": "sub-abc12345",
    "plan": "premium",
    "status": "active",
    "expires_at": "2026-06-23T10:00:00.000Z"
  }
}
```

---

### 3. Сброс пароля

**`POST /api/admin/reset-password`**

Генерирует новый пароль для подписчика.

**Тело запроса (JSON):**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `telegram_id` | string | Да | Telegram user ID |

**Пример запроса:**

```bash
curl -X POST https://<домен>/api/admin/reset-password \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: NJR_Q_GyzcVLT752eXPPOpQaOYginB5sRUcLkvdzqmhPdZzFQmwmsnJri-r1-fkn" \
  -d '{"telegram_id": "123456789"}'
```

**Успешный ответ (200):**

```json
{
  "success": true,
  "user_id": "uuid-строка",
  "email": "tg123456789@rtrader.app",
  "password": "bngnMMjvbK"
}
```

---

### 4. Блокировка / Разблокировка

**`POST /api/admin/block-subscriber`**

Блокирует или разблокирует подписчика.

**Тело запроса (JSON):**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `telegram_id` | string | Да | Telegram user ID |
| `blocked` | boolean | Да | `true` — заблокировать, `false` — разблокировать |

**Пример запроса:**

```bash
curl -X POST https://<домен>/api/admin/block-subscriber \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: NJR_Q_GyzcVLT752eXPPOpQaOYginB5sRUcLkvdzqmhPdZzFQmwmsnJri-r1-fkn" \
  -d '{"telegram_id": "123456789", "blocked": true}'
```

---

### 5. Статус подписчика

**`GET /api/admin/subscriber-status`**

Проверяет статус подписчика по `telegram_id` или `email`.

**Query-параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `telegram_id` | string | Telegram user ID |
| `email` | string | Email пользователя |

**Пример запроса:**

```bash
curl "https://<домен>/api/admin/subscriber-status?telegram_id=123456789" \
  -H "X-Admin-Key: NJR_Q_GyzcVLT752eXPPOpQaOYginB5sRUcLkvdzqmhPdZzFQmwmsnJri-r1-fkn"
```

**Успешный ответ (200):**

```json
{
  "registered": true,
  "user_id": "uuid-строка",
  "email": "tg123456789@rtrader.app",
  "telegram_id": "123456789",
  "username": "Иван Петров",
  "banned": false,
  "subscription": {
    "id": "sub-abc12345",
    "plan": "premium",
    "status": "active",
    "started_at": "2026-04-24T10:00:00.000Z",
    "expires_at": "2026-05-24T10:00:00.000Z",
    "is_expired": false
  }
}
```

**Если пользователь не найден (404):**

```json
{
  "error": "User not found",
  "registered": false
}
```

---

## Пример кода Telegram-бота (Python)

```python
import requests

API_BASE = "https://<ваш-домен>"
ADMIN_KEY = "NJR_Q_GyzcVLT752eXPPOpQaOYginB5sRUcLkvdzqmhPdZzFQmwmsnJri-r1-fkn"

HEADERS = {
    "Content-Type": "application/json",
    "X-Admin-Key": ADMIN_KEY,
}


def create_subscriber(telegram_id: str, name: str, days: int = 30) -> dict:
    """Создать нового подписчика после оплаты."""
    resp = requests.post(
        f"{API_BASE}/api/admin/create-subscriber",
        headers=HEADERS,
        json={
            "telegram_id": telegram_id,
            "telegram_name": name,
            "plan": "premium",
            "days": days,
        },
    )
    return resp.json()


def renew_subscription(telegram_id: str, days: int = 30) -> dict:
    """Продлить подписку."""
    resp = requests.post(
        f"{API_BASE}/api/admin/renew-subscription",
        headers=HEADERS,
        json={"telegram_id": telegram_id, "days": days},
    )
    return resp.json()


def check_status(telegram_id: str) -> dict:
    """Проверить статус подписчика."""
    resp = requests.get(
        f"{API_BASE}/api/admin/subscriber-status",
        headers=HEADERS,
        params={"telegram_id": telegram_id},
    )
    return resp.json()


def reset_password(telegram_id: str) -> dict:
    """Сбросить пароль подписчика."""
    resp = requests.post(
        f"{API_BASE}/api/admin/reset-password",
        headers=HEADERS,
        json={"telegram_id": telegram_id},
    )
    return resp.json()


# ─── Пример использования в обработчике оплаты ───

def on_payment_success(telegram_id: str, user_name: str):
    """Вызывается после подтверждения оплаты."""
    # Проверяем, есть ли уже аккаунт
    status = check_status(telegram_id)

    if status.get("registered"):
        # Уже есть аккаунт — продлеваем
        result = renew_subscription(telegram_id, days=30)
        return (
            f"✅ Подписка продлена!\n"
            f"Новая дата окончания: {result['subscription']['expires_at'][:10]}\n"
            f"Ваш email: {result['email']}"
        )
    else:
        # Новый пользователь — создаём аккаунт
        result = create_subscriber(telegram_id, user_name, days=30)
        if result.get("success"):
            return (
                f"✅ Аккаунт создан!\n\n"
                f"📧 Логин: {result['email']}\n"
                f"🔑 Пароль: {result['password']}\n\n"
                f"Скачайте приложение RTrader и войдите с этими данными.\n"
                f"Подписка активна до: {result['subscription']['expires_at'][:10]}"
            )
        else:
            return f"❌ Ошибка: {result.get('error', 'Неизвестная ошибка')}"
```

---

## Схема работы

```
Подписчик → Telegram-бот → Оплата → Бот вызывает API → Аккаунт создан
                                                         ↓
                                              Бот отправляет логин/пароль
                                                         ↓
                                              Подписчик входит в приложение
```

## Проверка подписки в приложении

При открытии экрана "Чаты" приложение автоматически проверяет статус подписки:

- **Активная подписка** — показывает список чатов
- **Истекшая подписка** — показывает экран "Подписка истекла" с кнопкой "Продлить в Telegram"

Проверка кэшируется на 5 минут для экономии запросов.

---

## Изменённые файлы

| Файл | Описание |
|------|----------|
| `server/routers/admin.ts` | Admin API эндпоинты (create, renew, reset, block, status) |
| `server/_core/index.ts` | Регистрация admin routes + X-Admin-Key в CORS |
| `hooks/use-subscription-guard.ts` | Хук проверки подписки |
| `components/subscription-expired.tsx` | Экран "Подписка истекла" |
| `app/(tabs)/chats.tsx` | Интеграция subscription guard |
| `__tests__/admin-api-key.test.ts` | Тесты валидации ADMIN_API_KEY |

## Безопасность

- `ADMIN_API_KEY` хранится **только** в переменных окружения сервера
- Ключ **не хардкодится** в коде и **не коммитится** в репозиторий
- Все admin-эндпоинты проверяют заголовок `X-Admin-Key` перед выполнением
- При неверном или отсутствующем ключе возвращается `401 Unauthorized`
