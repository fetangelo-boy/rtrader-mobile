# RTrader Telegram Bot — Deployment Guide

Production-ready Telegram-бот для управления подписками RTrader.

---

## Архитектура

```
Подписчик (Telegram) → @rtrader_bot → RTrader API (backend)
                              ↓
                    Админ (Telegram) — FSM ввод даты
```

Бот работает в режиме **long polling** — не требует SSL-сертификата, домена или открытых портов. Идеальный вариант для MVP.

---

## Переменные окружения

| Переменная | Обязательная | Описание | Пример |
|---|---|---|---|
| `BOT_TOKEN` | Да | Токен от @BotFather | `7123456789:AAH...` |
| `RTRADER_API_URL` | Да | URL backend API | `https://rtradermob-gjsezgkc.manus.space` |
| `ADMIN_API_KEY` | Да | Ключ для admin-эндпоинтов | `rtrader-admin-...` |
| `ADMIN_CHAT_ID` | Да | Telegram ID администратора | `123456789` |
| `RTRADER_HTTP_TIMEOUT` | Нет | Таймаут HTTP в секундах | `30` (по умолчанию) |

**Как узнать ADMIN_CHAT_ID:** отправьте `/start` боту @userinfobot — он покажет ваш ID.

---

## Вариант 1: Docker Compose (рекомендуется)

Самый быстрый и надёжный способ. Автоматический перезапуск, изоляция, логирование.

### Шаги

```bash
# 1. Скопировать файлы бота на сервер
scp -r bot/ user@your-server:/opt/rtrader-bot/

# 2. На сервере: создать .env
cd /opt/rtrader-bot
cp env-example.txt .env
nano .env   # заполнить реальные значения

# 3. Запустить
docker compose up -d --build

# 4. Проверить
docker compose logs -f
```

### Управление

| Действие | Команда |
|---|---|
| Запустить | `docker compose up -d` |
| Остановить | `docker compose down` |
| Перезапустить | `docker compose restart` |
| Логи (live) | `docker compose logs -f` |
| Логи (последние 100) | `docker compose logs --tail=100` |
| Статус | `docker compose ps` |
| Пересобрать после обновления | `docker compose up -d --build` |

### Обновление бота

```bash
cd /opt/rtrader-bot
# Заменить rtrader_bot.py новой версией
docker compose up -d --build
```

---

## Вариант 2: systemd (VPS без Docker)

Для серверов без Docker. Требует Python 3.11+.

### Шаги

```bash
# 1. Создать пользователя
sudo useradd -r -s /bin/false rtrader

# 2. Скопировать файлы
sudo mkdir -p /opt/rtrader-bot
sudo cp rtrader_bot.py requirements.txt /opt/rtrader-bot/
sudo cp env-example.txt /opt/rtrader-bot/.env
sudo nano /opt/rtrader-bot/.env   # заполнить значения

# 3. Создать venv и установить зависимости
cd /opt/rtrader-bot
sudo python3 -m venv venv
sudo ./venv/bin/pip install -r requirements.txt

# 4. Права
sudo chown -R rtrader:rtrader /opt/rtrader-bot

# 5. Установить systemd unit
sudo cp rtrader-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable rtrader-bot
sudo systemctl start rtrader-bot

# 6. Проверить
sudo systemctl status rtrader-bot
sudo journalctl -u rtrader-bot -f
```

### Управление

| Действие | Команда |
|---|---|
| Запустить | `sudo systemctl start rtrader-bot` |
| Остановить | `sudo systemctl stop rtrader-bot` |
| Перезапустить | `sudo systemctl restart rtrader-bot` |
| Логи (live) | `sudo journalctl -u rtrader-bot -f` |
| Логи (последние 100) | `sudo journalctl -u rtrader-bot -n 100` |
| Статус | `sudo systemctl status rtrader-bot` |
| Автозапуск вкл | `sudo systemctl enable rtrader-bot` |
| Автозапуск выкл | `sudo systemctl disable rtrader-bot` |

### Обновление бота

```bash
sudo systemctl stop rtrader-bot
sudo cp rtrader_bot.py /opt/rtrader-bot/
sudo chown rtrader:rtrader /opt/rtrader-bot/rtrader_bot.py
sudo systemctl start rtrader-bot
```

---

## Вариант 3: Быстрый запуск (тестирование)

Для быстрой проверки на любой машине с Python 3.11+:

```bash
cd bot/
pip install -r requirements.txt

# Задать переменные
export BOT_TOKEN="7123456789:AAH..."
export RTRADER_API_URL="https://rtradermob-gjsezgkc.manus.space"
export ADMIN_API_KEY="rtrader-admin-..."
export ADMIN_CHAT_ID="123456789"

# Запустить
python rtrader_bot.py
```

Для фонового запуска:

```bash
nohup python rtrader_bot.py > bot.log 2>&1 &
echo $! > bot.pid

# Остановить
kill $(cat bot.pid)

# Логи
tail -f bot.log
```

---

## Команды бота

### Для подписчиков

| Команда | Описание |
|---|---|
| `/start` | Приветствие и инструкция |
| `/help` | Как оформить подписку |
| `/status` | Проверка здоровья бота и API |
| *Отправить фото* | Загрузка чека → создание заявки |

### Для администратора

| Команда | Описание |
|---|---|
| `/pending` | Список заявок на рассмотрении |
| `/cancel` | Отмена ввода даты (во время FSM) |
| *Кнопка "Одобрить"* | Запуск FSM → ввод даты ДД.ММ.ГГГГ |
| *Кнопка "Отклонить"* | Отклонение заявки |

---

## Flow одобрения заявки

```
1. Подписчик отправляет фото чека
2. Бот загружает фото → создаёт заявку → пересылает админу
3. Админ нажимает "✅ Одобрить"
4. Бот: "Введите дату окончания в формате ДД.ММ.ГГГГ"
5. Админ вводит: 15.08.2026
6. Бот валидирует (формат + будущее) → отправляет approve в backend
7. Backend создаёт/продлевает аккаунт
8. Бот отправляет подписчику логин/пароль (новый) или подтверждение (продление)
```

---

## Production-фичи

Бот включает следующие production-ready механизмы:

- **HTTP retry** — 3 попытки с экспоненциальной задержкой для всех API-запросов
- **Shared HTTP session** — переиспользование соединений вместо создания нового на каждый запрос
- **Configurable timeout** — `RTRADER_HTTP_TIMEOUT` (по умолчанию 30 секунд)
- **Graceful shutdown** — корректное закрытие сессий при SIGTERM/SIGINT
- **Startup notification** — админ получает сообщение "🟢 Бот запущен" при старте
- **Shutdown notification** — админ получает "🔴 Бот остановлен" при остановке
- **Health check** — команда `/status` проверяет доступность API
- **API health check on startup** — проверка API при старте (warning, не блокирует)
- **Docker healthcheck** — для мониторинга контейнера
- **systemd hardening** — NoNewPrivileges, ProtectSystem, ProtectHome
- **Auto-restart** — `restart: unless-stopped` (Docker) / `Restart=always` (systemd)

---

## Polling vs Webhook

Для MVP используется **polling** — это правильный выбор:

| Критерий | Polling | Webhook |
|---|---|---|
| Требует SSL | Нет | Да |
| Требует домен | Нет | Да |
| Требует открытый порт | Нет | Да |
| Задержка | ~1-2 сек | ~0.1 сек |
| Нагрузка | Минимальная для MVP | Оптимальнее при >1000 юзеров |
| Сложность деплоя | Минимальная | Средняя |

Переход на webhook имеет смысл при >1000 активных пользователей. Для текущего этапа polling — оптимален.

---

## Важно

- Бот **НЕ** вычисляет дату автоматически (+30 дней и т.д.)
- Администратор **всегда** вводит точную дату вручную
- Дата валидируется (формат ДД.ММ.ГГГГ, должна быть в будущем)
- ADMIN_API_KEY хранится только в переменных окружения, не в коде

---

## Troubleshooting

| Проблема | Решение |
|---|---|
| `Unauthorized` | Проверьте BOT_TOKEN — получите новый у @BotFather |
| `Connection refused` | Проверьте RTRADER_API_URL — сервер должен быть доступен |
| `403 Forbidden` | Проверьте ADMIN_API_KEY — должен совпадать с backend |
| Бот не отвечает | `docker compose logs -f` или `journalctl -u rtrader-bot -f` |
| FSM не работает | Убедитесь, что пишете в тот же чат, где нажали "Одобрить" |
| Дата не принимается | Формат строго ДД.ММ.ГГГГ, дата в будущем |
