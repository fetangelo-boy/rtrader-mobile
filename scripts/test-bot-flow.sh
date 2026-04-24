#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# RTrader — Полный тест bot flow (create → approve → credentials → login)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Этот скрипт имитирует весь цикл:
#   1. Подписчик отправляет чек в бота → создаётся заявка
#   2. Админ видит заявку в списке
#   3. Админ одобряет заявку с датой окончания
#   4. Система создаёт аккаунт или продлевает подписку
#   5. Подписчик получает логин/пароль
#   6. Подписчик входит в приложение
#
# Использование:
#   ./scripts/test-bot-flow.sh [API_URL] [ADMIN_KEY]
#
# Примеры:
#   ./scripts/test-bot-flow.sh                                    # localhost
#   ./scripts/test-bot-flow.sh https://your-api.com YOUR_KEY      # production
# ═══════════════════════════════════════════════════════════════════════════════

# Не используем set -e, чтобы скрипт продолжал работу при ошибках парсинга

API_URL="${1:-http://127.0.0.1:3000}"
ADMIN_KEY="${2:-${ADMIN_API_KEY:-}}"

if [ -z "$ADMIN_KEY" ]; then
  echo "❌ ADMIN_API_KEY не задан. Укажите вторым аргументом или через env."
  exit 1
fi

# Уникальный telegram_id для теста
TELEGRAM_ID="test_$(date +%s)"
TELEGRAM_USERNAME="smoke_tester_$(date +%s)"
APPROVED_UNTIL=$(date -d "+30 days" +%Y-%m-%d 2>/dev/null || date -v+30d +%Y-%m-%d 2>/dev/null || echo "2026-05-24")

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  RTrader Bot Flow Test"
echo "═══════════════════════════════════════════════════════════════"
echo "  API:            $API_URL"
echo "  Telegram ID:    $TELEGRAM_ID"
echo "  Username:       $TELEGRAM_USERNAME"
echo "  Подписка до:    $APPROVED_UNTIL"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Шаг 1: Подписчик отправляет чек (бот создаёт заявку) ────────────────────
echo "━━━ Шаг 1: Подписчик отправляет чек → бот создаёт заявку ━━━"
RESPONSE=$(curl -s -X POST "$API_URL/api/requests/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"channel\": \"telegram\",
    \"telegram_id\": \"$TELEGRAM_ID\",
    \"telegram_username\": \"$TELEGRAM_USERNAME\",
    \"receipt_url\": \"https://example.com/receipt_$TELEGRAM_ID.jpg\"
  }")

echo "Ответ бота подписчику:"
echo "$RESPONSE"

REQUEST_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('request_id',''))" 2>/dev/null)
if [ -z "$REQUEST_ID" ]; then
  echo "❌ Не удалось создать заявку"
  exit 1
fi
echo ""
echo "✅ Заявка #$REQUEST_ID создана, статус: pending_review"
echo ""

# ─── Шаг 2: Админ видит заявку в списке ──────────────────────────────────────
echo "━━━ Шаг 2: Админ просматривает список заявок ━━━"
REQUESTS=$(curl -s "$API_URL/api/admin/requests?status=pending_review" \
  -H "X-Admin-Key: $ADMIN_KEY")

echo "Список заявок на рассмотрении:"
echo "$REQUESTS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
requests = data.get('requests', [])
print(f'  \u0412\u0441\u0435\u0433\u043e \u0437\u0430\u044f\u0432\u043e\u043a: {len(requests)}')
for r in requests:
    tg = r.get('telegramName') or r.get('telegram_username') or '\u2014'
    ts = (r.get('createdAt') or r.get('created_at') or '')[:19]
    print(f'  #{r[\"id\"]} | {r[\"channel\"]} | tg:@{tg} | {r[\"status\"]} | {ts}')
" 2>/dev/null
echo ""

# ─── Шаг 3: Админ смотрит детали заявки ──────────────────────────────────────
echo "━━━ Шаг 3: Админ открывает детали заявки #$REQUEST_ID ━━━"
DETAIL=$(curl -s "$API_URL/api/admin/requests/$REQUEST_ID" \
  -H "X-Admin-Key: $ADMIN_KEY")

echo "Детали заявки:"
echo "$DETAIL" | python3 -c "
import sys, json
r = json.load(sys.stdin).get('request', {})
print(f'  ID:          #{r[\"id\"]}')
print(f'  \u041a\u0430\u043d\u0430\u043b:       {r[\"channel\"]}')
tg_name = r.get('telegramName') or r.get('telegram_username') or '\u2014'
tg_id = r.get('telegramId') or r.get('telegram_id') or '\u2014'
receipt = r.get('receiptUrl') or r.get('receipt_url') or '\u2014'
ts = (r.get('createdAt') or r.get('created_at') or '')[:19]
print(f'  Telegram:    @{tg_name} (ID: {tg_id})')
print(f'  \u0427\u0435\u043a:         {receipt}')
print(f'  \u0421\u0442\u0430\u0442\u0443\u0441:      {r[\"status\"]}')
print(f'  \u0421\u043e\u0437\u0434\u0430\u043d\u0430:     {ts}')
" 2>/dev/null
echo ""

# ─── Шаг 4: Админ одобряет заявку с датой окончания ──────────────────────────
echo "━━━ Шаг 4: Админ одобряет заявку (подписка до $APPROVED_UNTIL) ━━━"
APPROVE=$(curl -s -X POST "$API_URL/api/admin/requests/$REQUEST_ID/approve" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d "{
    \"approved_until\": \"$APPROVED_UNTIL\",
    \"plan\": \"premium\",
    \"admin_note\": \"Чек проверен, оплата подтверждена\"
  }")

echo "Результат одобрения:"
echo "$APPROVE"

# Извлекаем credentials (API возвращает email/password на верхнем уровне)
EMAIL=$(echo "$APPROVE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('email',''))" 2>/dev/null)
PASSWORD=$(echo "$APPROVE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('password',''))" 2>/dev/null)
IS_NEW=$(echo "$APPROVE" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('is_new_user') else 'no')" 2>/dev/null)

echo ""
if [ "$IS_NEW" = "yes" ]; then
  echo "✅ Новый аккаунт создан!"
  echo "   📧 Email:    $EMAIL"
  echo "   🔑 Пароль:   $PASSWORD"
  echo "   📅 До:       $APPROVED_UNTIL"
elif [ "$IS_NEW" = "no" ]; then
  echo "✅ Подписка продлена!"
  echo "   📧 Email:    $EMAIL"
  echo "   📅 До:       $APPROVED_UNTIL"
else
  echo "⚠️  Не удалось распознать ответ"
fi
echo ""

# ─── Шаг 5: Проверяем статус подписчика ──────────────────────────────────────
if [ -n "$EMAIL" ]; then
  echo "━━━ Шаг 5: Проверяем статус подписчика ━━━"
  STATUS=$(curl -s "$API_URL/api/admin/subscriber-status?email=$EMAIL" \
    -H "X-Admin-Key: $ADMIN_KEY")

  echo "Статус подписчика:"
  echo "$STATUS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'  Зарегистрирован: {d[\"registered\"]}')
sub = d.get('subscription', {})
if sub:
    print(f'  Тариф:           {sub.get(\"plan\",\"—\")}')
    print(f'  Статус:          {sub.get(\"status\",\"—\")}')
    print(f'  Истекает:        {sub.get(\"expires_at\",\"—\")[:19] if sub.get(\"expires_at\") else \"—\"}')
" 2>/dev/null
  echo ""
fi

# ─── Шаг 6: Пробуем войти в приложение ──────────────────────────────────────
if [ -n "$EMAIL" ] && [ -n "$PASSWORD" ]; then
  echo "━━━ Шаг 6: Вход в приложение с полученными credentials ━━━"
  LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

  LOGIN_OK=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('session') or d.get('access_token') else 'no')" 2>/dev/null)

  if [ "$LOGIN_OK" = "yes" ]; then
    echo "✅ Вход успешен! Пользователь может работать в приложении."
  else
    echo "⚠️  Вход не удался (ответ сервера):"
    echo "$LOGIN"
  fi
  echo ""
fi

# ─── Итог ────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "  ИТОГ ТЕСТА"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Что бот отправит подписчику в Telegram:"
echo "  ────────────────────────────────────────"
if [ "$IS_NEW" = "yes" ]; then
  echo "  🎉 Ваша подписка оформлена!"
  echo ""
  echo "  📧 Логин:    $EMAIL"
  echo "  🔑 Пароль:   $PASSWORD"
  echo "  📅 Действует до: $APPROVED_UNTIL"
  echo ""
  echo "  Скачайте приложение RTrader и войдите"
  echo "  с этими данными."
else
  echo "  ✅ Ваша подписка продлена!"
  echo ""
  echo "  📧 Аккаунт:  $EMAIL"
  echo "  📅 Действует до: $APPROVED_UNTIL"
fi
echo ""
echo "═══════════════════════════════════════════════════════════════"
