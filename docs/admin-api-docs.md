# RTrader Admin API — Документация для Telegram-бота

## Базовый URL

После публикации URL будет:
```
https://<ваш-домен>
```

## Аутентификация

Все admin-эндпоинты (`/api/admin/*`) требуют заголовок:
```
X-Admin-Key: <ADMIN_API_KEY>
```

Публичные эндпоинты (`/api/requests/*`) не требуют ключа.

---

## Основной Flow (Telegram-бот)

```
Пользователь → Бот: скрин чека
Бот → API: POST /api/requests/upload-receipt (загрузка чека)
Бот → API: POST /api/requests/create (создание заявки)
Бот → Пользователь: "Чек принят, ожидайте"
Бот → Админ: пересылка заявки с чеком

Админ проверяет чек, задаёт дату окончания подписки

Админ → Бот: одобрить / отклонить
Бот → API: POST /api/admin/requests/{id}/approve (или reject)
API → Бот: результат (логин/пароль для нового или подтверждение для существующего)
Бот → Пользователь: логин/пароль или "подписка продлена до..."
```

---

## Эндпоинты (Новый Request Flow)

### 1. Загрузка чека

```
POST /api/requests/upload-receipt
Content-Type: multipart/form-data
```

| Поле | Тип | Описание |
|------|-----|----------|
| `file` | File | Скриншот чека (JPEG/PNG, до 10MB) |

**Ответ:**
```json
{
  "success": true,
  "url": "https://storage.example.com/receipts/1234-abcd.jpg"
}
```

---

### 2. Создание заявки

```
POST /api/requests/create
Content-Type: application/json
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `channel` | string | Да | `"telegram"` или `"email"` |
| `telegram_id` | string | Для telegram | Telegram user ID |
| `telegram_name` | string | Нет | Имя из Telegram |
| `email` | string | Для email | Email пользователя |
| `contact_name` | string | Нет | Имя пользователя |
| `receipt_url` | string | Да | URL чека из upload-receipt |
| `receipt_text` | string | Нет | Комментарий |

**Ответ:**
```json
{
  "success": true,
  "request_id": 1,
  "status": "pending_review",
  "message": "Ваш чек принят и находится на рассмотрении администратором, пожалуйста, ожидайте."
}
```

---

### 3. Список заявок (Admin)

```
GET /api/admin/requests
X-Admin-Key: <key>
```

| Параметр | Описание |
|----------|----------|
| `status` | Фильтр: `pending_review`, `approved`, `rejected`, `executed`, `failed` |
| `channel` | Фильтр: `telegram`, `email` |
| `limit` | Кол-во записей (по умолчанию 50, макс 100) |
| `offset` | Смещение для пагинации |

**Ответ:**
```json
{
  "requests": [
    {
      "id": 1,
      "channel": "telegram",
      "status": "pending_review",
      "telegramId": "123456789",
      "telegramName": "Иван Петров",
      "receiptUrl": "https://...",
      "createdAt": "2026-04-24T18:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### 4. Детали заявки (Admin)

```
GET /api/admin/requests/{id}
X-Admin-Key: <key>
```

---

### 5. Одобрить заявку (Admin)

```
POST /api/admin/requests/{id}/approve
X-Admin-Key: <key>
Content-Type: application/json
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `approved_until` | string | Да | Дата окончания подписки (ISO 8601) |
| `approved_plan` | string | Нет | План (по умолчанию `"premium"`) |
| `admin_note` | string | Нет | Комментарий администратора |

**Ответ для нового пользователя:**
```json
{
  "success": true,
  "request_id": 1,
  "status": "executed",
  "is_new_user": true,
  "user_id": "uuid",
  "email": "tg123456789@rtrader.app",
  "password": "Xk9mP2qR",
  "subscription": {
    "plan": "premium",
    "expires_at": "2026-06-01T00:00:00.000Z"
  },
  "message": "Новый аккаунт создан. Логин: tg123456789@rtrader.app, Пароль: Xk9mP2qR"
}
```

**Ответ для существующего пользователя:**
```json
{
  "success": true,
  "request_id": 3,
  "status": "executed",
  "is_new_user": false,
  "user_id": "uuid",
  "email": "tg123456789@rtrader.app",
  "subscription": {
    "plan": "premium",
    "expires_at": "2026-09-01T00:00:00.000Z"
  },
  "message": "Подписка продлена до 31.08.2026"
}
```

> **Важно:** Для нового пользователя в ответе есть `password`. Бот должен отправить его пользователю. Для существующего — пароль не возвращается.

---

### 6. Отклонить заявку (Admin)

```
POST /api/admin/requests/{id}/reject
X-Admin-Key: <key>
Content-Type: application/json
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `admin_note` | string | Нет | Причина отклонения |

**Ответ:**
```json
{
  "success": true,
  "request_id": 2,
  "status": "rejected",
  "admin_note": "Чек не соответствует сумме",
  "channel": "telegram",
  "telegram_id": "123456789",
  "message": "Заявка отклонена."
}
```

---

## Старые эндпоинты (обратная совместимость)

Эти эндпоинты по-прежнему работают для прямого управления:

| Эндпоинт | Описание |
|----------|----------|
| `POST /api/admin/create-subscriber` | Прямое создание пользователя (без заявки) |
| `POST /api/admin/renew-subscription` | Прямое продление подписки |
| `POST /api/admin/reset-password` | Сброс пароля |
| `POST /api/admin/block-subscriber` | Блокировка/разблокировка |
| `GET /api/admin/subscriber-status` | Статус подписчика |

---

## Полный пример бота (aiogram 3.x)

```python
import os
import aiohttp
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from datetime import datetime, timedelta

API_URL = os.getenv("RTRADER_API_URL")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")
ADMIN_CHAT_ID = int(os.getenv("ADMIN_CHAT_ID"))

bot = Bot(token=os.getenv("BOT_TOKEN"))
dp = Dispatcher()


# --- Пользовательские хэндлеры ---

@dp.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer(
        "Добро пожаловать в RTrader!\n\n"
        "Для оформления подписки отправьте скриншот чека об оплате."
    )

@dp.message(F.photo)
async def handle_receipt_photo(message: Message):
    """Пользователь отправил фото чека."""
    # 1. Скачать фото
    photo = message.photo[-1]
    file = await bot.get_file(photo.file_id)
    file_path = f"/tmp/receipt_{message.from_user.id}.jpg"
    await bot.download_file(file.file_path, file_path)

    # 2. Загрузить на сервер
    async with aiohttp.ClientSession() as session:
        data = aiohttp.FormData()
        data.add_field('file', open(file_path, 'rb'), filename='receipt.jpg')
        async with session.post(f"{API_URL}/api/requests/upload-receipt", data=data) as resp:
            upload_result = await resp.json()

    receipt_url = upload_result["url"]

    # 3. Создать заявку
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{API_URL}/api/requests/create", json={
            "channel": "telegram",
            "telegram_id": str(message.from_user.id),
            "telegram_name": message.from_user.full_name,
            "receipt_url": receipt_url,
            "receipt_text": message.caption or "",
        }) as resp:
            result = await resp.json()

    request_id = result["request_id"]

    # 4. Ответить пользователю
    await message.answer(
        "✅ Ваш чек принят и находится на рассмотрении.\n"
        "Пожалуйста, ожидайте — мы сообщим о результате."
    )

    # 5. Переслать админу с кнопками
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ 1 мес", callback_data=f"approve:{request_id}:30"),
            InlineKeyboardButton(text="✅ 3 мес", callback_data=f"approve:{request_id}:90"),
            InlineKeyboardButton(text="✅ 6 мес", callback_data=f"approve:{request_id}:180"),
        ],
        [InlineKeyboardButton(text="❌ Отклонить", callback_data=f"reject:{request_id}")],
    ])

    await bot.send_photo(
        ADMIN_CHAT_ID,
        photo.file_id,
        caption=(
            f"📋 Заявка #{request_id}\n"
            f"👤 {message.from_user.full_name} (ID: {message.from_user.id})\n"
            f"💬 {message.caption or 'без комментария'}"
        ),
        reply_markup=keyboard,
    )


# --- Админские хэндлеры ---

@dp.callback_query(F.data.startswith("approve:"))
async def handle_approve(callback: CallbackQuery):
    """Админ нажал кнопку одобрения."""
    _, request_id, days = callback.data.split(":")
    approved_until = (datetime.utcnow() + timedelta(days=int(days))).isoformat() + "Z"

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_URL}/api/admin/requests/{request_id}/approve",
            json={"approved_until": approved_until, "approved_plan": "premium"},
            headers={"X-Admin-Key": ADMIN_API_KEY},
        ) as resp:
            result = await resp.json()

    if result.get("success"):
        tg_id = result.get("telegram_id")
        if result.get("is_new_user") and tg_id:
            await bot.send_message(
                int(tg_id),
                f"🎉 Ваш аккаунт создан!\n\n"
                f"📧 Логин: {result['email']}\n"
                f"🔑 Пароль: {result['password']}\n"
                f"📅 Подписка до: {result['subscription']['expires_at'][:10]}\n\n"
                f"Скачайте приложение и войдите с этими данными."
            )
        elif tg_id:
            await bot.send_message(
                int(tg_id),
                f"✅ Подписка продлена до {result['subscription']['expires_at'][:10]}"
            )

        await callback.message.edit_caption(
            caption=callback.message.caption + f"\n\n✅ Одобрено до {approved_until[:10]}",
            reply_markup=None,
        )
    else:
        await callback.answer(f"Ошибка: {result.get('error', 'unknown')}", show_alert=True)

@dp.callback_query(F.data.startswith("reject:"))
async def handle_reject(callback: CallbackQuery):
    """Админ нажал кнопку отклонения."""
    _, request_id = callback.data.split(":")

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_URL}/api/admin/requests/{request_id}/reject",
            json={"admin_note": "Чек отклонён администратором"},
            headers={"X-Admin-Key": ADMIN_API_KEY},
        ) as resp:
            result = await resp.json()

    if result.get("success"):
        tg_id = result.get("telegram_id")
        if tg_id:
            await bot.send_message(
                int(tg_id),
                "❌ К сожалению, ваша заявка отклонена.\n"
                "Пожалуйста, проверьте данные оплаты и попробуйте снова."
            )

        await callback.message.edit_caption(
            caption=callback.message.caption + "\n\n❌ Отклонено",
            reply_markup=None,
        )

if __name__ == "__main__":
    dp.run_polling(bot)
```

---

## Переменные окружения для бота

```env
BOT_TOKEN=<Telegram Bot Token>
RTRADER_API_URL=https://your-api-domain.com
ADMIN_API_KEY=<тот же ключ, что в приложении>
ADMIN_CHAT_ID=<Telegram ID администратора>
```

---

## Безопасность

- `ADMIN_API_KEY` хранится только в переменных окружения сервера
- Ключ не хардкодится в коде и не коммитится в репозиторий
- Все admin-эндпоинты проверяют заголовок `X-Admin-Key` перед выполнением
- При неверном или отсутствующем ключе возвращается `401 Unauthorized`
- Публичные эндпоинты (`/api/requests/create`, `/api/requests/upload-receipt`) не требуют ключа — они создают заявки в статусе `pending_review`
