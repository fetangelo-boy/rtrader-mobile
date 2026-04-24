# RTrader Telegram Bot

Telegram-бот для управления подписками RTrader.

## Что делает бот

1. Принимает скриншоты чеков от подписчиков
2. Создаёт заявки на подписку через RTrader API
3. Пересылает заявки администратору с кнопками "Одобрить" / "Отклонить"
4. При одобрении — просит админа ввести **точную дату** окончания подписки (ДД.ММ.ГГГГ)
5. Отправляет подписчику логин/пароль (новый аккаунт) или подтверждение (продление)

## Установка

```bash
cd bot
pip install -r requirements.txt
```

## Настройка

Скопируйте `env-example.txt` в `.env` и заполните:

```bash
cp env-example.txt .env
nano .env
```

| Переменная | Описание | Где взять |
|-----------|----------|-----------|
| `BOT_TOKEN` | Токен бота | @BotFather в Telegram |
| `RTRADER_API_URL` | URL backend API | `https://rtradermob-gjsezgkc.manus.space` |
| `ADMIN_API_KEY` | Ключ для admin API | Тот же, что в приложении |
| `ADMIN_CHAT_ID` | Telegram ID админа | @userinfobot в Telegram |

## Запуск

```bash
python rtrader_bot.py
```

Или через systemd (для автозапуска на сервере):

```ini
[Unit]
Description=RTrader Telegram Bot
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/bot
EnvironmentFile=/path/to/bot/.env
ExecStart=/usr/bin/python3 /path/to/bot/rtrader_bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Команды бота

| Команда | Кто | Описание |
|---------|-----|----------|
| `/start` | Подписчик | Приветствие и инструкция |
| `/help` | Подписчик | Справка по оформлению подписки |
| `/pending` | Админ | Список заявок на рассмотрении |
| `/cancel` | Админ | Отмена ввода даты (во время FSM) |

## Flow одобрения

```
Подписчик: [отправляет фото чека]
Бот → Подписчик: "✅ Ваш чек принят!"
Бот → Админ: [фото + кнопки "Одобрить" / "Отклонить"]

Админ: [нажимает "✅ Одобрить"]
Бот → Админ: "Введите дату окончания подписки (ДД.ММ.ГГГГ)"

Админ: "15.07.2026"
Бот → Backend: POST /api/admin/requests/{id}/approve
Backend → Бот: {email, password, expires_at}

Бот → Подписчик: "🎉 Ваш аккаунт создан! Логин: ... Пароль: ..."
Бот → Админ: "✅ Заявка #N одобрена до 15.07.2026"
```

## Важно

- Бот **НЕ** вычисляет дату автоматически (+30 дней и т.д.)
- Администратор **всегда** вводит точную дату вручную
- Дата валидируется (формат ДД.ММ.ГГГГ, должна быть в будущем)
- ADMIN_API_KEY хранится только в переменных окружения, не в коде
