# RTrader — Единый Backend на Beget (Россия)

**Автор:** Manus AI  
**Дата:** 28 апреля 2026  
**Статус:** Архитектурный план для обсуждения

---

## 1. Текущая ситуация

На данный момент инфраструктура RTrader распределена между несколькими сервисами:

| Компонент | Где сейчас | Статус |
|-----------|-----------|--------|
| Сайт rtrader11.ru | poehali.dev CDN → переезжает на Beget | В процессе |
| Мобильное приложение (backend) | Sandbox Manus (Supabase vfxezndvkaxlimthkeyx) | Временно |
| Telegram-бот | Sandbox Manus (polling) | Временно |
| База данных приложения | Supabase PostgreSQL (за рубежом) | Временно |
| База данных сайта | MySQL на Beget (планируется) | Планируется |

**Проблемы текущей схемы:**
- Supabase хранит ПД за пределами РФ (нарушение 152-ФЗ)
- Две отдельные базы данных для сайта и приложения (дублирование подписчиков)
- Бот работает только в sandbox (не production)
- Нет единой точки управления пользователями

---

## 2. Целевая архитектура: всё на Beget

Предлагается **единый backend на Beget VPS** в России, который обслуживает и сайт, и мобильное приложение, и Telegram-бота.

### 2.1. Почему Beget

| Критерий | Beget VPS |
|----------|-----------|
| Расположение серверов | Санкт-Петербург, Россия |
| 152-ФЗ | Полное соответствие |
| Docker | Предустановлен в marketplace |
| Node.js | Предустановлен (PM2 + Nginx) |
| Python | Доступен |
| MySQL | Встроенная поддержка + DBaaS |
| Тестовый период | 30 дней бесплатно |
| Минимальная цена | ~480₽/мес (1 ядро, 1GB RAM, 10GB NVMe + IPv4) |
| SSH-доступ | Да (root) |
| Бэкапы | Бесплатные, автоматические |

### 2.2. Рекомендуемый тариф для старта

**VPS «Старт»** — 1 ядро, 1GB RAM, 10GB NVMe — достаточно для MVP с 50-100 пользователями.

При росте до 500+ пользователей — переход на 2 ядра, 2GB RAM (~900₽/мес).

### 2.3. Схема архитектуры

```
┌─────────────────────────────────────────────────────┐
│                  Beget VPS (Россия)                  │
│                                                     │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Nginx    │  │  Node.js API │  │  Telegram    │ │
│  │  (proxy)  │──│  (Express)   │  │  Bot (Python)│ │
│  │  :80/:443 │  │  :3000       │  │              │ │
│  └─────┬─────┘  └──────┬───────┘  └──────┬───────┘ │
│        │               │                 │         │
│        │        ┌──────┴─────────────────┘         │
│        │        │                                   │
│        │  ┌─────▼──────┐                           │
│        │  │   MySQL     │                           │
│        │  │   :3306     │                           │
│        │  │             │                           │
│        │  │ users       │                           │
│        │  │ subscriptions│                          │
│        │  │ chats       │                           │
│        │  │ messages    │                           │
│        │  │ requests    │                           │
│        │  │ site_content│                           │
│        │  └─────────────┘                           │
│        │                                            │
│  ┌─────▼──────┐                                    │
│  │ Static     │                                    │
│  │ files      │                                    │
│  │ (React SPA)│                                    │
│  └────────────┘                                    │
└─────────────────────────────────────────────────────┘
         │                    │
    ┌────▼────┐         ┌────▼────┐
    │ Браузер │         │ Моб.    │
    │ (сайт)  │         │ прил.   │
    └─────────┘         └─────────┘
```

---

## 3. Единая база данных MySQL

Ключевое решение: **одна MySQL база** для сайта и мобильного приложения. Это устраняет проблему синхронизации подписок.

### 3.1. Схема таблиц

**Таблица `users`** — единый реестр пользователей

| Поле | Тип | Описание |
|------|-----|----------|
| id | INT AUTO_INCREMENT | Внутренний ID |
| uuid | CHAR(36) | UUID v4 для API |
| email | VARCHAR(255) | Email (ПД, хранится в РФ) |
| password_hash | VARCHAR(255) | Bcrypt хеш пароля |
| display_name | VARCHAR(100) | Отображаемое имя |
| telegram_id | BIGINT | Telegram ID (ПД) |
| telegram_username | VARCHAR(100) | Telegram username (ПД) |
| avatar_url | VARCHAR(500) | URL аватара |
| role | ENUM('subscriber','admin') | Роль |
| created_at | DATETIME | Дата регистрации |
| updated_at | DATETIME | Дата обновления |

**Таблица `subscriptions`** — единая подписка на оба продукта

| Поле | Тип | Описание |
|------|-----|----------|
| id | INT AUTO_INCREMENT | ID |
| user_id | INT | FK → users.id |
| status | ENUM('active','expired','blocked') | Статус |
| plan | VARCHAR(50) | Тариф (basic, vip) |
| approved_until | DATETIME | Дата окончания |
| source | ENUM('bot','admin','site') | Откуда пришла подписка |
| created_at | DATETIME | Дата создания |

**Таблица `consent_log`** — согласия на обработку ПД (152-ФЗ)

| Поле | Тип | Описание |
|------|-----|----------|
| id | INT AUTO_INCREMENT | ID |
| user_id | INT | FK → users.id |
| consent_type | VARCHAR(50) | Тип согласия |
| consent_text | TEXT | Текст согласия |
| ip_address | VARCHAR(45) | IP при согласии |
| given_at | DATETIME | Дата согласия |
| revoked_at | DATETIME | Дата отзыва (NULL если действует) |

**Таблица `payment_requests`** — заявки на оплату

| Поле | Тип | Описание |
|------|-----|----------|
| id | INT AUTO_INCREMENT | ID |
| user_id | INT | FK → users.id |
| receipt_photo_url | VARCHAR(500) | URL чека |
| status | ENUM('pending','approved','rejected') | Статус |
| admin_note | TEXT | Комментарий админа |
| reviewed_by | INT | FK → users.id (админ) |
| created_at | DATETIME | Дата заявки |
| reviewed_at | DATETIME | Дата рассмотрения |

**Таблица `chats`** — чаты (общие для сайта и приложения)

| Поле | Тип | Описание |
|------|-----|----------|
| id | INT AUTO_INCREMENT | ID |
| name | VARCHAR(100) | Название чата |
| description | TEXT | Описание |
| chat_type | ENUM('interactive','info_only') | Тип |
| icon | VARCHAR(50) | Иконка |
| sort_order | INT | Порядок сортировки |

**Таблица `messages`** — сообщения в чатах

| Поле | Тип | Описание |
|------|-----|----------|
| id | INT AUTO_INCREMENT | ID |
| chat_id | INT | FK → chats.id |
| user_id | INT | FK → users.id |
| content | TEXT | Текст сообщения |
| reply_to_id | INT | FK → messages.id (ответ) |
| created_at | DATETIME | Дата |

**Таблица `chat_participants`** — участники чатов

| Поле | Тип | Описание |
|------|-----|----------|
| id | INT AUTO_INCREMENT | ID |
| chat_id | INT | FK → chats.id |
| user_id | INT | FK → users.id |
| role | ENUM('admin','participant','subscriber') | Роль в чате |
| is_muted | BOOLEAN | Мьют уведомлений |
| joined_at | DATETIME | Дата вступления |

**Таблица `push_tokens`** — токены для push-уведомлений

| Поле | Тип | Описание |
|------|-----|----------|
| id | INT AUTO_INCREMENT | ID |
| user_id | INT | FK → users.id |
| expo_push_token | VARCHAR(255) | Expo Push Token |
| device_type | ENUM('android','ios','web') | Тип устройства |
| created_at | DATETIME | Дата регистрации |

### 3.2. Что меняется по сравнению с Supabase

| Аспект | Было (Supabase) | Стало (Beget MySQL) |
|--------|-----------------|---------------------|
| СУБД | PostgreSQL | MySQL |
| ORM | Drizzle (pg) | Drizzle (mysql2) |
| Auth | Supabase Auth | Собственная (JWT) |
| Realtime | Supabase Realtime | Polling / SSE |
| RLS | PostgreSQL RLS | Проверки в API-слое |
| Хостинг | AWS (за рубежом) | Beget (Россия) |
| ПД | Нарушение 152-ФЗ | Соответствие 152-ФЗ |

---

## 4. Что нужно адаптировать в коде

### 4.1. Backend (server/)

| Файл | Изменение | Сложность |
|------|-----------|-----------|
| server/_core/db.ts | Переключить Drizzle с `pg` на `mysql2` | Средняя |
| server/_core/schema.ts | Адаптировать типы (pgTable → mysqlTable) | Средняя |
| server/routers/auth.ts | Убрать Supabase Auth, оставить JWT | Низкая (уже частично есть) |
| server/routers/chat.ts | Убрать Supabase client, использовать Drizzle | Средняя |
| server/routers/admin.ts | Адаптировать SQL-запросы | Низкая |
| server/routers/requests.ts | Адаптировать SQL-запросы | Низкая |

### 4.2. Мобильное приложение (app/)

| Файл | Изменение | Сложность |
|------|-----------|-----------|
| lib/trpc.ts | Изменить API URL на Beget | Минимальная |
| lib/supabase.ts | Удалить (не нужен) | Минимальная |
| Все экраны | Без изменений (работают через tRPC) | Нет |

### 4.3. Telegram-бот (bot/)

| Файл | Изменение | Сложность |
|------|-----------|-----------|
| bot/rtrader_bot.py | Изменить API URL на Beget | Минимальная |
| bot/Dockerfile | Без изменений | Нет |

**Ключевой момент:** мобильное приложение и бот общаются с backend через HTTP API (tRPC). Им всё равно, какая СУБД на сервере — PostgreSQL или MySQL. Нужно адаптировать только серверный код.

---

## 5. План миграции (MVP за 3-5 дней)

### День 1: Подготовка Beget VPS

1. Зарегистрировать аккаунт на Beget (30 дней бесплатно)
2. Создать VPS с Docker (marketplace)
3. Настроить SSH-доступ
4. Установить MySQL, Node.js, Python
5. Настроить Nginx как reverse proxy

### День 2: Миграция базы данных

1. Создать MySQL базу данных по схеме из раздела 3.1
2. Адаптировать Drizzle ORM: pg → mysql2
3. Перенести seed-данные (чаты, начальные настройки)
4. Проверить все SQL-запросы

### День 3: Миграция backend

1. Адаптировать серверный код (auth, chat, admin, requests)
2. Убрать зависимости от Supabase
3. Настроить JWT-аутентификацию
4. Задеплоить Node.js API на Beget VPS
5. Проверить все API endpoints

### День 4: Миграция бота и тестирование

1. Задеплоить Telegram-бота на Beget VPS
2. Изменить API URL в боте на Beget
3. Протестировать полный цикл: регистрация → оплата → одобрение → вход
4. Протестировать чаты, отправку сообщений, admin-only каналы

### День 5: Финализация

1. Изменить API URL в мобильном приложении
2. Собрать новый APK через Publish
3. Перенести статику сайта rtrader11.ru на Beget
4. Настроить DNS для rtrader11.ru → Beget
5. Настроить SSL (Let's Encrypt)

---

## 6. Синхронизация подписок сайт ↔ приложение

С единой базой MySQL синхронизация **не нужна** — это одна и та же таблица `subscriptions`.

| Действие | Результат |
|----------|----------|
| Подписчик оплатил через бота | Запись в `subscriptions` → видна и на сайте, и в приложении |
| Админ продлил через API | Обновление `subscriptions` → видна везде |
| Подписка истекла | Статус `expired` → блокировка и на сайте, и в приложении |

Это главное преимущество единой базы — **одна подписка, два продукта, ноль синхронизации**.

---

## 7. Влияние на компоненты

### 7.1. Auth (авторизация)

Сейчас: Supabase Auth (email/password) + JWT.
После: Собственная auth на Express (bcrypt + JWT). Код уже частично написан — нужно убрать вызовы Supabase и оставить прямую работу с MySQL.

### 7.2. Регистрация

Сейчас: Бот → API → Supabase.
После: Бот → API → MySQL на Beget. Логика не меняется, меняется только адрес API и драйвер БД.

### 7.3. Telegram-бот

Сейчас: Работает в sandbox, обращается к localhost:3000.
После: Работает на Beget VPS, обращается к localhost:3000 (на том же сервере). Код бота не меняется, кроме URL.

### 7.4. Subscription flow

Сейчас: Бот → API → Supabase → приложение читает через tRPC.
После: Бот → API → MySQL → приложение читает через tRPC. Для пользователя ничего не меняется.

### 7.5. Push-уведомления

Реализуем на Beget: при новом сообщении в чате → сервер отправляет push через Expo Push API. Таблица `push_tokens` хранит токены устройств.

---

## 8. Риски и компромиссы

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Beget VPS недостаточно мощный | Низкая | Начинаем с минимального тарифа, масштабируем при необходимости |
| MySQL вместо PostgreSQL — потеря функций | Низкая | Для нашего случая MySQL достаточно (нет jsonb, CTE используются минимально) |
| Нет Supabase Realtime | Средняя | Используем polling (уже работает) или SSE для чатов |
| Downtime при миграции | Средняя | Параллельный запуск: старый backend работает, пока новый тестируется |
| Потеря данных из Supabase | Низкая | Экспортируем все данные перед отключением |

---

## 9. Альтернативный вариант: PostgreSQL на Beget

Beget также предлагает **DBaaS PostgreSQL**. Если использовать его вместо MySQL:

**Плюсы:**
- Не нужно переписывать ORM (Drizzle остаётся на pg)
- Сохраняются все текущие миграции
- Меньше работы по адаптации кода

**Минусы:**
- Две базы данных (MySQL для сайта, PostgreSQL для приложения) — нужна синхронизация подписок
- Дополнительная стоимость за DBaaS

**Рекомендация:** Если сайт rtrader11.ru использует MySQL для хранения пользователей и подписок — лучше **перейти на MySQL** для единой базы. Если сайт — чисто статический React без своей базы пользователей — можно оставить PostgreSQL.

---

## 10. Итоговая рекомендация

**Оптимальный путь:**

1. **Beget VPS** с Docker — единый сервер для всего
2. **MySQL** — единая база для сайта и приложения
3. **Адаптация backend** — Drizzle pg → mysql2 (3-5 дней)
4. **Бот на том же VPS** — localhost:3000, без внешних вызовов
5. **Одна подписка** — работает и на сайте, и в приложении
6. **152-ФЗ** — все ПД в России, на серверах Beget (СПб)

**Стоимость:** ~480₽/мес (минимальный VPS) → бесплатно первые 30 дней.

**Время реализации:** 3-5 рабочих дней.

---

## Приложение: Docker Compose для Beget

```yaml
version: '3.8'

services:
  api:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://rtrader:${DB_PASSWORD}@mysql:3306/rtrader
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_API_KEY=${ADMIN_API_KEY}
    depends_on:
      - mysql
    restart: always

  bot:
    build: ./bot
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - API_URL=http://api:3000
      - ADMIN_API_KEY=${ADMIN_API_KEY}
      - ADMIN_CHAT_ID=${ADMIN_CHAT_ID}
    depends_on:
      - api
    restart: always

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=rtrader
      - MYSQL_USER=rtrader
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
      - ./site/dist:/var/www/html
    depends_on:
      - api
    restart: always

volumes:
  mysql_data:
```

---

*Документ подготовлен для обсуждения. После согласования архитектуры — переходим к реализации.*
