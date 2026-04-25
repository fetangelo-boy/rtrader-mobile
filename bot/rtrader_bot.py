"""
RTrader Telegram Bot — Управление подписками
=============================================
aiogram 3.x | FSM для ручного ввода даты | Интеграция с RTrader API

Production-ready: graceful shutdown, HTTP timeouts, retry, signal handling.

Основной flow:
  1. Подписчик отправляет скрин чека → бот загружает на сервер и создаёт заявку
  2. Бот пересылает заявку админу с кнопками "Одобрить" / "Отклонить"
  3. Админ нажимает "Одобрить" → бот просит ввести дату окончания (ДД.ММ.ГГГГ)
  4. Бот валидирует дату, отправляет approve в backend
  5. Backend создаёт/продлевает аккаунт, возвращает credentials
  6. Бот отправляет подписчику логин/пароль (новый) или подтверждение (продление)

Переменные окружения (.env):
  BOT_TOKEN            — Telegram Bot Token от @BotFather
  RTRADER_API_URL      — URL backend API (например https://rtradermob-gjsezgkc.manus.space)
  ADMIN_API_KEY        — Ключ для admin-эндпоинтов (X-Admin-Key)
  ADMIN_CHAT_ID        — Telegram ID администратора (число)
  RTRADER_HTTP_TIMEOUT — Таймаут HTTP-запросов в секундах (по умолчанию 30)
"""

import os
import re
import sys
import signal
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional

import aiohttp
from aiohttp import ClientTimeout
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    Message,
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage

# ─── Конфигурация ────────────────────────────────────────────────────────────

# Загрузка .env (если python-dotenv установлен)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BOT_TOKEN = os.environ["BOT_TOKEN"]
API_URL = os.environ["RTRADER_API_URL"].rstrip("/")
ADMIN_API_KEY = os.environ["ADMIN_API_KEY"]
ADMIN_CHAT_ID = int(os.environ["ADMIN_CHAT_ID"])
HTTP_TIMEOUT = int(os.environ.get("RTRADER_HTTP_TIMEOUT", "30"))

# ─── Логирование ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("rtrader_bot")

# ─── Инициализация ───────────────────────────────────────────────────────────

bot = Bot(token=BOT_TOKEN)
storage = MemoryStorage()
dp = Dispatcher(storage=storage)

# Shared aiohttp session (создаётся при старте, закрывается при остановке)
_http_session: Optional[aiohttp.ClientSession] = None


async def get_http_session() -> aiohttp.ClientSession:
    """Получить или создать shared HTTP-сессию с таймаутами."""
    global _http_session
    if _http_session is None or _http_session.closed:
        timeout = ClientTimeout(total=HTTP_TIMEOUT, connect=10)
        _http_session = aiohttp.ClientSession(timeout=timeout)
    return _http_session


async def close_http_session():
    """Закрыть HTTP-сессию при остановке."""
    global _http_session
    if _http_session and not _http_session.closed:
        await _http_session.close()
        _http_session = None


# ─── FSM States ──────────────────────────────────────────────────────────────

class AdminApproval(StatesGroup):
    """FSM для ожидания ввода даты от администратора."""
    waiting_for_date = State()


# ─── Вспомогательные функции ─────────────────────────────────────────────────

def admin_headers() -> dict:
    """Заголовки для admin-эндпоинтов."""
    return {
        "X-Admin-Key": ADMIN_API_KEY,
        "Content-Type": "application/json",
    }


async def api_post(path: str, json: dict | None = None, headers: dict | None = None) -> dict:
    """POST-запрос к RTrader API с retry."""
    url = f"{API_URL}{path}"
    session = await get_http_session()
    last_error = None
    for attempt in range(3):
        try:
            async with session.post(url, json=json, headers=headers) as resp:
                data = await resp.json()
                logger.info("POST %s → %s %s", path, resp.status, data.get("success", ""))
                return data
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            last_error = e
            logger.warning("POST %s attempt %d failed: %s", path, attempt + 1, e)
            if attempt < 2:
                await asyncio.sleep(1 * (attempt + 1))
    logger.error("POST %s failed after 3 attempts: %s", path, last_error)
    return {"success": False, "error": f"HTTP error: {last_error}"}


async def api_get(path: str, headers: dict | None = None) -> dict:
    """GET-запрос к RTrader API с retry."""
    url = f"{API_URL}{path}"
    session = await get_http_session()
    last_error = None
    for attempt in range(3):
        try:
            async with session.get(url, headers=headers) as resp:
                data = await resp.json()
                return data
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            last_error = e
            logger.warning("GET %s attempt %d failed: %s", path, attempt + 1, e)
            if attempt < 2:
                await asyncio.sleep(1 * (attempt + 1))
    logger.error("GET %s failed after 3 attempts: %s", path, last_error)
    return {"success": False, "error": f"HTTP error: {last_error}"}


async def upload_receipt(file_bytes: bytes, filename: str = "receipt.jpg") -> str | None:
    """Загрузить чек на сервер, вернуть URL."""
    url = f"{API_URL}/api/requests/upload-receipt"
    session = await get_http_session()
    try:
        form = aiohttp.FormData()
        form.add_field("file", file_bytes, filename=filename, content_type="image/jpeg")
        async with session.post(url, data=form) as resp:
            data = await resp.json()
            if data.get("success"):
                return data["url"]
            logger.error("Upload receipt failed: %s", data)
            return None
    except (aiohttp.ClientError, asyncio.TimeoutError) as e:
        logger.error("Upload receipt HTTP error: %s", e)
        return None


def parse_date(text: str) -> datetime | None:
    """
    Парсинг даты из строки в формате ДД.ММ.ГГГГ.
    Возвращает datetime с временем 23:59:59 UTC или None при ошибке.
    """
    text = text.strip()
    match = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})$", text)
    if not match:
        return None
    day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
    try:
        return datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
    except ValueError:
        return None


def format_date_ru(dt: datetime) -> str:
    """Форматирование даты в ДД.ММ.ГГГГ."""
    return dt.strftime("%d.%m.%Y")


# ═══════════════════════════════════════════════════════════════════════════════
#  ПОЛЬЗОВАТЕЛЬСКИЕ ХЭНДЛЕРЫ
# ═══════════════════════════════════════════════════════════════════════════════

@dp.message(CommandStart())
async def cmd_start(message: Message):
    """Команда /start — приветствие."""
    await message.answer(
        "👋 Добро пожаловать в RTrader!\n\n"
        "Для оформления подписки отправьте скриншот чека об оплате.\n\n"
        "После проверки администратором вы получите логин и пароль "
        "для входа в приложение."
    )


@dp.message(Command("help"))
async def cmd_help(message: Message):
    """Команда /help — справка."""
    await message.answer(
        "📖 Как оформить подписку:\n\n"
        "1️⃣ Оплатите подписку по реквизитам\n"
        "2️⃣ Отправьте скриншот чека в этот чат\n"
        "3️⃣ Дождитесь подтверждения от администратора\n"
        "4️⃣ Получите логин и пароль\n"
        "5️⃣ Скачайте приложение RTrader и войдите\n\n"
        "По вопросам: @rhodes4ever"
    )


@dp.message(Command("status"))
async def cmd_status(message: Message):
    """Команда /status — проверка здоровья бота и API."""
    try:
        result = await api_get("/api/health")
        api_ok = result.get("ok", False)
    except Exception:
        api_ok = False

    status_text = (
        f"🤖 Бот: работает\n"
        f"🌐 API: {'✅ доступен' if api_ok else '❌ недоступен'}\n"
        f"📡 URL: {API_URL}\n"
        f"⏱ Timeout: {HTTP_TIMEOUT}s"
    )
    await message.answer(status_text)


@dp.message(F.photo, lambda m: m.chat.id != ADMIN_CHAT_ID)
async def handle_receipt_photo(message: Message):
    """Подписчик отправил фото чека."""
    user = message.from_user
    logger.info("Receipt from %s (ID: %s)", user.full_name, user.id)

    # Отправляем «обрабатываю» пока загружаем
    processing_msg = await message.answer("⏳ Обрабатываю ваш чек...")

    try:
        # 1. Скачать фото (берём самое большое разрешение)
        photo = message.photo[-1]
        file_info = await bot.get_file(photo.file_id)
        file_bytes = await bot.download_file(file_info.file_path)
        photo_bytes = file_bytes.read()

        # 2. Загрузить на сервер
        receipt_url = await upload_receipt(photo_bytes, f"receipt_{user.id}.jpg")
        if not receipt_url:
            await processing_msg.edit_text(
                "❌ Не удалось загрузить чек. Попробуйте ещё раз или обратитесь в поддержку: @rhodes4ever"
            )
            return

        # 3. Создать заявку
        result = await api_post("/api/requests/create", json={
            "channel": "telegram",
            "telegram_id": str(user.id),
            "telegram_name": user.full_name or user.username or "",
            "receipt_url": receipt_url,
            "receipt_text": message.caption or "",
        })

        if not result.get("success"):
            await processing_msg.edit_text(
                f"❌ Ошибка при создании заявки: {result.get('error', 'неизвестная ошибка')}\n"
                "Обратитесь в поддержку: @rhodes4ever"
            )
            return

        request_id = result["request_id"]

        # 4. Ответить подписчику
        await processing_msg.edit_text(
            f"✅ Ваш чек принят! (Заявка #{request_id})\n\n"
            "Пожалуйста, ожидайте — администратор проверит оплату "
            "и вы получите данные для входа."
        )

        # 5. Переслать админу с кнопками
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Одобрить", callback_data=f"approve:{request_id}")],
            [InlineKeyboardButton(text="❌ Отклонить", callback_data=f"reject:{request_id}")],
        ])

        await bot.send_photo(
            ADMIN_CHAT_ID,
            photo.file_id,
            caption=(
                f"📋 Заявка #{request_id}\n"
                f"👤 {user.full_name} (@{user.username or '—'})\n"
                f"🆔 ID: {user.id}\n"
                f"💬 {message.caption or 'без комментария'}"
            ),
            reply_markup=keyboard,
        )

        logger.info("Request #%s created, forwarded to admin", request_id)

    except Exception as e:
        logger.exception("Error handling receipt from %s", user.id)
        try:
            await processing_msg.edit_text(
                "❌ Произошла ошибка при обработке чека.\n"
                "Попробуйте ещё раз или обратитесь в поддержку: @rhodes4ever"
            )
        except Exception:
            pass


@dp.message(lambda m: m.chat.id != ADMIN_CHAT_ID and not m.photo)
async def handle_unknown_message(message: Message):
    """Подписчик отправил текст (не фото) — подсказываем."""
    # Игнорируем команды (кроме обработанных выше)
    if message.text and message.text.startswith("/"):
        return
    await message.answer(
        "📸 Для оформления подписки отправьте скриншот чека об оплате.\n\n"
        "Если у вас вопрос — обратитесь в поддержку: @rhodes4ever"
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  АДМИНСКИЕ ХЭНДЛЕРЫ
# ═══════════════════════════════════════════════════════════════════════════════

@dp.callback_query(F.data.startswith("approve:"))
async def handle_approve_start(callback: CallbackQuery, state: FSMContext):
    """Админ нажал '✅ Одобрить' — бот просит ввести дату."""
    _, request_id = callback.data.split(":")

    # Сохраняем данные в FSM
    await state.update_data(
        request_id=request_id,
        admin_message_id=callback.message.message_id,
        admin_caption=callback.message.caption or "",
    )
    await state.set_state(AdminApproval.waiting_for_date)

    await callback.message.reply(
        f"📅 Заявка #{request_id}\n\n"
        f"Введите дату окончания подписки в формате ДД.ММ.ГГГГ\n"
        f"Например: 15.07.2026\n\n"
        f"Для отмены отправьте /cancel"
    )
    await callback.answer()


@dp.message(Command("cancel"), AdminApproval.waiting_for_date)
async def handle_cancel_approval(message: Message, state: FSMContext):
    """Отмена ввода даты."""
    await state.clear()
    await message.reply("❌ Одобрение отменено. Нажмите кнопку заново для повторной попытки.")


@dp.message(AdminApproval.waiting_for_date)
async def handle_approve_date(message: Message, state: FSMContext):
    """Админ ввёл дату — валидируем и отправляем approve."""
    text = message.text.strip() if message.text else ""

    # Валидация формата ДД.ММ.ГГГГ
    expiry_date = parse_date(text)
    if not expiry_date:
        await message.reply(
            "❌ Неверный формат даты.\n\n"
            "Введите дату в формате ДД.ММ.ГГГГ, например: 15.07.2026\n"
            "Для отмены: /cancel"
        )
        return

    # Проверка: дата должна быть в будущем
    if expiry_date <= datetime.now(timezone.utc):
        await message.reply(
            "❌ Дата должна быть в будущем.\n\n"
            "Введите корректную дату или /cancel для отмены."
        )
        return

    # Получаем данные из FSM
    data = await state.get_data()
    request_id = data["request_id"]
    admin_caption = data.get("admin_caption", "")

    # Конвертируем в ISO 8601
    approved_until = expiry_date.strftime("%Y-%m-%dT%H:%M:%SZ")
    date_display = format_date_ru(expiry_date)

    logger.info("Admin approving #%s until %s", request_id, approved_until)

    # Отправляем approve в backend
    result = await api_post(
        f"/api/admin/requests/{request_id}/approve",
        json={
            "approved_until": approved_until,
            "approved_plan": "premium",
        },
        headers=admin_headers(),
    )

    # Очищаем FSM
    await state.clear()

    if not result.get("success"):
        error_msg = result.get("error", "неизвестная ошибка")
        await message.reply(f"❌ Ошибка одобрения: {error_msg}")
        logger.error("Approve #%s failed: %s", request_id, error_msg)
        return

    # ─── Уведомляем подписчика ───────────────────────────────────────────

    # Получаем telegram_id из заявки
    req_data = await api_get(
        f"/api/admin/requests/{request_id}",
        headers=admin_headers(),
    )
    tg_id = req_data.get("telegramId") or req_data.get("telegram_id")

    if result.get("is_new_user"):
        # Новый пользователь — отправляем логин и пароль (с deep link)
        if tg_id:
            try:
                # Генерируем deep link для автоматического входа
                import urllib.parse
                email_encoded = urllib.parse.quote(result['email'])
                password_encoded = urllib.parse.quote(result['password'])
                deep_link = f"rtrader://login?email={email_encoded}&password={password_encoded}"
                
                message_text = (
                    f"🎉 Ваш аккаунт создан!\n\n"
                    f"📧 Логин: {result['email']}\n"
                    f"🔑 Пароль: {result['password']}\n"
                    f"📅 Подписка до: {date_display}\n\n"
                    f"🔗 [Войти в приложение]({deep_link})\n\n"
                    f"Или скачайте приложение RTrader и войдите вручную.\n"
                    f"Рекомендуем сменить пароль после первого входа."
                )
                
                await bot.send_message(
                    int(tg_id),
                    message_text,
                    parse_mode="Markdown"
                )
            except Exception as e:
                logger.warning("Failed to notify user %s: %s", tg_id, e)

        await message.reply(
            f"✅ Заявка #{request_id} одобрена!\n\n"
            f"📧 Логин: {result['email']}\n"
            f"🔑 Пароль: {result['password']}\n"
            f"📅 До: {date_display}\n"
            f"🆕 Новый аккаунт"
        )
    else:
        # Существующий пользователь — подтверждение продления
        if tg_id:
            try:
                await bot.send_message(
                    int(tg_id),
                    f"✅ Ваша подписка продлена до {date_display}!\n\n"
                    f"Продолжайте пользоваться приложением RTrader."
                )
            except Exception as e:
                logger.warning("Failed to notify user %s: %s", tg_id, e)

        await message.reply(
            f"✅ Заявка #{request_id} одобрена!\n\n"
            f"📧 Аккаунт: {result['email']}\n"
            f"📅 До: {date_display}\n"
            f"🔄 Подписка продлена"
        )

    # Обновляем сообщение с заявкой (убираем кнопки, добавляем статус)
    try:
        await bot.edit_message_caption(
            chat_id=ADMIN_CHAT_ID,
            message_id=data.get("admin_message_id"),
            caption=admin_caption + f"\n\n✅ Одобрено до {date_display}",
            reply_markup=None,
        )
    except Exception:
        pass  # Сообщение могло быть удалено или слишком старое

    logger.info("Request #%s approved until %s", request_id, date_display)


@dp.callback_query(F.data.startswith("reject:"))
async def handle_reject(callback: CallbackQuery):
    """Админ нажал '❌ Отклонить'."""
    _, request_id = callback.data.split(":")

    result = await api_post(
        f"/api/admin/requests/{request_id}/reject",
        json={"admin_note": "Чек отклонён администратором"},
        headers=admin_headers(),
    )

    if result.get("success"):
        # Уведомляем подписчика
        tg_id = result.get("telegram_id")
        if tg_id:
            try:
                await bot.send_message(
                    int(tg_id),
                    "❌ К сожалению, ваша заявка отклонена.\n\n"
                    "Пожалуйста, проверьте данные оплаты и попробуйте снова.\n"
                    "По вопросам: @rhodes4ever"
                )
            except Exception as e:
                logger.warning("Failed to notify user %s: %s", tg_id, e)

        # Обновляем сообщение админа
        try:
            await callback.message.edit_caption(
                caption=(callback.message.caption or "") + "\n\n❌ Отклонено",
                reply_markup=None,
            )
        except Exception:
            pass

        await callback.answer("Заявка отклонена")
        logger.info("Request #%s rejected", request_id)
    else:
        await callback.answer(f"Ошибка: {result.get('error', '?')}", show_alert=True)


# ─── Команда для просмотра заявок ────────────────────────────────────────────

@dp.message(Command("pending"), lambda m: m.chat.id == ADMIN_CHAT_ID)
async def cmd_pending(message: Message):
    """Показать список заявок на рассмотрении (только для админа)."""
    result = await api_get(
        "/api/admin/requests?status=pending_review&limit=20",
        headers=admin_headers(),
    )

    requests = result.get("requests", [])
    total = result.get("total", 0)

    if not requests:
        await message.answer("📭 Нет заявок на рассмотрении.")
        return

    lines = [f"📋 Заявки на рассмотрении ({len(requests)} из {total}):\n"]
    for r in requests:
        tg_name = r.get("telegramName") or r.get("telegram_name") or "—"
        created = (r.get("createdAt") or r.get("created_at") or "")[:16]
        lines.append(f"  #{r['id']} | {tg_name} | {created}")

    await message.answer("\n".join(lines))


# ═══════════════════════════════════════════════════════════════════════════════
#  ЗАПУСК
# ═══════════════════════════════════════════════════════════════════════════════

async def on_startup():
    """Действия при старте бота."""
    logger.info("Bot starting...")
    logger.info("API URL: %s", API_URL)
    logger.info("Admin chat ID: %s", ADMIN_CHAT_ID)
    logger.info("HTTP timeout: %ds", HTTP_TIMEOUT)

    # Проверяем доступность API
    try:
        result = await api_get("/api/health")
        if result.get("ok"):
            logger.info("API health check: OK")
        else:
            logger.warning("API health check: unexpected response %s", result)
    except Exception as e:
        logger.warning("API health check failed (bot will retry on requests): %s", e)

    # Уведомляем админа о старте
    try:
        await bot.send_message(ADMIN_CHAT_ID, "🟢 RTrader бот запущен и готов к работе.")
    except Exception as e:
        logger.warning("Failed to notify admin about startup: %s", e)


async def on_shutdown():
    """Действия при остановке бота."""
    logger.info("Bot shutting down...")
    # Уведомляем админа об остановке
    try:
        await bot.send_message(ADMIN_CHAT_ID, "🔴 RTrader бот остановлен.")
    except Exception:
        pass
    await close_http_session()
    await bot.session.close()
    logger.info("Bot stopped cleanly.")


async def main():
    # Удаляем старые вебхуки (если были)
    await bot.delete_webhook(drop_pending_updates=True)

    # Регистрируем startup/shutdown
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    # Запускаем polling
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot interrupted by user (Ctrl+C)")
    except Exception as e:
        logger.critical("Bot crashed: %s", e, exc_info=True)
        sys.exit(1)
