#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# RTrader — Полный E2E тест: чек → заявка → approve с точной датой → вход
# ═══════════════════════════════════════════════════════════════════════════════

API_URL="http://127.0.0.1:3000"
ADMIN_KEY="$ADMIN_API_KEY"

# Уникальный ID для этого теста
TS=$(date +%s)
TG_ID="e2e_${TS}"
TG_NAME="E2E Tester ${TS}"
# Точная дата — 15 августа 2026
EXACT_DATE="2026-08-15T23:59:59Z"
DISPLAY_DATE="15.08.2026"

PASS=0
FAIL=0

check() {
  local name="$1"
  local condition="$2"
  if [ "$condition" = "true" ]; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  RTrader E2E Test — $(date)"
echo "═══════════════════════════════════════════════════════════════"
echo "  API:         $API_URL"
echo "  Telegram ID: $TG_ID"
echo "  Дата:        $DISPLAY_DATE"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Шаг 1: Создание заявки ─────────────────────────────────────────────────
echo "━━━ Шаг 1: Создание заявки (имитация отправки чека) ━━━"
CREATE_RESP=$(curl -s -X POST "$API_URL/api/requests/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"channel\": \"telegram\",
    \"telegram_id\": \"$TG_ID\",
    \"telegram_name\": \"$TG_NAME\",
    \"receipt_url\": \"https://example.com/receipt_${TG_ID}.jpg\",
    \"receipt_text\": \"E2E test payment\"
  }")

echo "  Response: $CREATE_RESP"

CREATE_OK=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('success') else 'false')" 2>/dev/null)
REQUEST_ID=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('request_id',''))" 2>/dev/null)
STATUS=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)

check "Заявка создана" "$CREATE_OK"
check "request_id получен ($REQUEST_ID)" "$([ -n "$REQUEST_ID" ] && echo true || echo false)"
check "Статус = pending_review" "$([ "$STATUS" = "pending_review" ] && echo true || echo false)"
echo ""

if [ -z "$REQUEST_ID" ]; then
  echo "❌ FATAL: Не удалось создать заявку, прерываю тест"
  exit 1
fi

# ─── Шаг 2: Список заявок (админ) ───────────────────────────────────────────
echo "━━━ Шаг 2: Список заявок (админ видит новую заявку) ━━━"
LIST_RESP=$(curl -s "$API_URL/api/admin/requests?status=pending_review" \
  -H "X-Admin-Key: $ADMIN_KEY")

FOUND=$(echo "$LIST_RESP" | python3 -c "
import sys, json
data = json.load(sys.stdin)
found = any(r.get('id') == $REQUEST_ID for r in data.get('requests', []))
print('true' if found else 'false')
" 2>/dev/null)

check "Заявка #$REQUEST_ID в списке pending" "$FOUND"
echo ""

# ─── Шаг 3: Детали заявки ───────────────────────────────────────────────────
echo "━━━ Шаг 3: Детали заявки #$REQUEST_ID ━━━"
DETAIL_RESP=$(curl -s "$API_URL/api/admin/requests/$REQUEST_ID" \
  -H "X-Admin-Key: $ADMIN_KEY")

DETAIL_TG=$(echo "$DETAIL_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('telegramId',''))" 2>/dev/null)
DETAIL_STATUS=$(echo "$DETAIL_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null)

check "telegramId = $TG_ID" "$([ "$DETAIL_TG" = "$TG_ID" ] && echo true || echo false)"
check "status = pending_review" "$([ "$DETAIL_STATUS" = "pending_review" ] && echo true || echo false)"
echo ""

# ─── Шаг 4: Одобрение с ТОЧНОЙ датой ────────────────────────────────────────
echo "━━━ Шаг 4: Одобрение заявки (дата: $DISPLAY_DATE) ━━━"
APPROVE_RESP=$(curl -s -X POST "$API_URL/api/admin/requests/$REQUEST_ID/approve" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d "{
    \"approved_until\": \"$EXACT_DATE\",
    \"approved_plan\": \"premium\"
  }")

echo "  Response: $APPROVE_RESP"

APPROVE_OK=$(echo "$APPROVE_RESP" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('success') else 'false')" 2>/dev/null)
IS_NEW=$(echo "$APPROVE_RESP" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('is_new_user') else 'false')" 2>/dev/null)
EMAIL=$(echo "$APPROVE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email',''))" 2>/dev/null)
PASSWORD=$(echo "$APPROVE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('password',''))" 2>/dev/null)
EXPIRES=$(echo "$APPROVE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('subscription',{}).get('expires_at',''))" 2>/dev/null)
APPROVE_STATUS=$(echo "$APPROVE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)

check "Approve success" "$APPROVE_OK"
check "status = executed" "$([ "$APPROVE_STATUS" = "executed" ] && echo true || echo false)"
check "is_new_user = true" "$IS_NEW"
check "email получен ($EMAIL)" "$([ -n "$EMAIL" ] && echo true || echo false)"
check "password получен" "$([ -n "$PASSWORD" ] && echo true || echo false)"
check "expires_at содержит 2026-08-15" "$(echo "$EXPIRES" | grep -q '2026-08-15' && echo true || echo false)"
echo ""

# ─── Шаг 5: Проверка статуса подписчика ─────────────────────────────────────
echo "━━━ Шаг 5: Статус подписчика ━━━"
if [ -n "$EMAIL" ]; then
  SUB_RESP=$(curl -s "$API_URL/api/admin/subscriber-status?email=$EMAIL" \
    -H "X-Admin-Key: $ADMIN_KEY")

  echo "  Response: $SUB_RESP"

  REGISTERED=$(echo "$SUB_RESP" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('registered') else 'false')" 2>/dev/null)
  SUB_STATUS=$(echo "$SUB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('subscription',{}).get('status',''))" 2>/dev/null)
  SUB_PLAN=$(echo "$SUB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('subscription',{}).get('plan',''))" 2>/dev/null)

  check "Пользователь зарегистрирован" "$REGISTERED"
  check "Подписка active" "$([ "$SUB_STATUS" = "active" ] && echo true || echo false)"
  check "План = premium" "$([ "$SUB_PLAN" = "premium" ] && echo true || echo false)"
else
  echo "  ⚠️  Пропущен — email не получен"
fi
echo ""

# ─── Шаг 6: Вход в приложение ───────────────────────────────────────────────
echo "━━━ Шаг 6: Вход в приложение ━━━"
if [ -n "$EMAIL" ] && [ -n "$PASSWORD" ]; then
  LOGIN_RESP=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

  LOGIN_OK=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('session') or d.get('access_token') else 'false')" 2>/dev/null)
  TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); s=d.get('session',{}); print(s.get('access_token','')[:20] + '...' if s.get('access_token') else '')" 2>/dev/null)

  check "Вход успешен" "$LOGIN_OK"
  check "Access token получен ($TOKEN)" "$([ -n "$TOKEN" ] && echo true || echo false)"
else
  echo "  ⚠️  Пропущен — credentials не получены"
fi
echo ""

# ─── Шаг 7: Повторная заявка (тест renew) ───────────────────────────────────
echo "━━━ Шаг 7: Повторная заявка (тест продления) ━━━"
RENEW_CREATE=$(curl -s -X POST "$API_URL/api/requests/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"channel\": \"telegram\",
    \"telegram_id\": \"$TG_ID\",
    \"telegram_name\": \"$TG_NAME\",
    \"receipt_url\": \"https://example.com/receipt_renew_${TG_ID}.jpg\"
  }")

RENEW_ID=$(echo "$RENEW_CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('request_id',''))" 2>/dev/null)

if [ -n "$RENEW_ID" ]; then
  # Одобряем с новой датой — 15 декабря 2026
  RENEW_RESP=$(curl -s -X POST "$API_URL/api/admin/requests/$RENEW_ID/approve" \
    -H "Content-Type: application/json" \
    -H "X-Admin-Key: $ADMIN_KEY" \
    -d "{
      \"approved_until\": \"2026-12-15T23:59:59Z\",
      \"approved_plan\": \"premium\"
    }")

  RENEW_OK=$(echo "$RENEW_RESP" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('success') else 'false')" 2>/dev/null)
  RENEW_NEW=$(echo "$RENEW_RESP" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('is_new_user') else 'false')" 2>/dev/null)
  RENEW_EXPIRES=$(echo "$RENEW_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('subscription',{}).get('expires_at',''))" 2>/dev/null)

  check "Продление success" "$RENEW_OK"
  check "is_new_user = false (существующий)" "$([ "$RENEW_NEW" = "false" ] && echo true || echo false)"
  check "expires_at обновлён до 2026-12-15" "$(echo "$RENEW_EXPIRES" | grep -q '2026-12-15' && echo true || echo false)"
else
  echo "  ⚠️  Не удалось создать повторную заявку"
fi
echo ""

# ─── Шаг 8: Тест отклонения ─────────────────────────────────────────────────
echo "━━━ Шаг 8: Тест отклонения заявки ━━━"
REJECT_CREATE=$(curl -s -X POST "$API_URL/api/requests/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"channel\": \"telegram\",
    \"telegram_id\": \"reject_test_${TS}\",
    \"telegram_name\": \"Reject Tester\",
    \"receipt_url\": \"https://example.com/bad_receipt.jpg\"
  }")

REJECT_ID=$(echo "$REJECT_CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('request_id',''))" 2>/dev/null)

if [ -n "$REJECT_ID" ]; then
  REJECT_RESP=$(curl -s -X POST "$API_URL/api/admin/requests/$REJECT_ID/reject" \
    -H "Content-Type: application/json" \
    -H "X-Admin-Key: $ADMIN_KEY" \
    -d "{\"admin_note\": \"E2E test: чек не соответствует\"}")

  REJECT_OK=$(echo "$REJECT_RESP" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('success') else 'false')" 2>/dev/null)
  REJECT_STATUS=$(echo "$REJECT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)

  check "Отклонение success" "$REJECT_OK"
  check "Статус = rejected" "$([ "$REJECT_STATUS" = "rejected" ] && echo true || echo false)"
else
  echo "  ⚠️  Не удалось создать заявку для отклонения"
fi
echo ""

# ─── Итог ────────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL))
echo "═══════════════════════════════════════════════════════════════"
echo "  ИТОГ: $PASS/$TOTAL тестов пройдено"
if [ $FAIL -eq 0 ]; then
  echo "  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!"
else
  echo "  ⚠️  $FAIL тестов не пройдено"
fi
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Credentials для входа:"
echo "  📧 Email:    $EMAIL"
echo "  🔑 Пароль:   $PASSWORD"
echo "  📅 До:       $DISPLAY_DATE (обновлено до 15.12.2026)"
echo ""
