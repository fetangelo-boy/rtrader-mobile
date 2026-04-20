-- Seed script for test data
-- This creates a test user and associated data for development/testing
-- 8 chats: 5 interactive + 3 info-only (read-only for subscribers)

-- Insert test profile
INSERT INTO profiles (id, email, full_name, subscription_status, created_at, updated_at)
VALUES (
  'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd',
  'test@rtrader.com',
  'Test User',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Insert 8 test chats (5 interactive + 3 info-only)
INSERT INTO chats (id, name, description, type, created_at, updated_at)
VALUES 
  -- Interactive chats (5)
  ('chat-1', 'Газ/нефть', 'Обсуждение энергоносителей и цен на нефть', 'interactive', NOW(), NOW()),
  ('chat-2', 'Продуктовый', 'Торговля продовольственными товарами', 'interactive', NOW(), NOW()),
  ('chat-3', 'Металлы', 'Драгоценные и промышленные металлы', 'interactive', NOW(), NOW()),
  ('chat-4', 'Чат', 'Общее обсуждение и новости', 'interactive', NOW(), NOW()),
  ('chat-5', 'Технические вопросы', 'Помощь с техническими проблемами', 'interactive', NOW(), NOW()),
  -- Info-only chats (3)
  ('chat-6', 'Приходящая', 'Входящие торговые сигналы и аналитика', 'info_only', NOW(), NOW()),
  ('chat-7', 'Интрадей и мысли', 'Интрадневные идеи и аналитические размышления', 'info_only', NOW(), NOW()),
  ('chat-8', 'Видео-разборы', 'Видеоматериалы и разборы торговых стратегий', 'info_only', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Add test user as participant in all chats (as participant for interactive, subscriber for info-only)
INSERT INTO chat_participants (chat_id, user_id, role, joined_at)
VALUES 
  ('chat-1', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'participant', NOW()),
  ('chat-2', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'participant', NOW()),
  ('chat-3', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'participant', NOW()),
  ('chat-4', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'participant', NOW()),
  ('chat-5', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'participant', NOW()),
  ('chat-6', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'subscriber', NOW()),
  ('chat-7', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'subscriber', NOW()),
  ('chat-8', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'subscriber', NOW())
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- Insert test messages for each chat
INSERT INTO messages (id, chat_id, user_id, content, created_at, updated_at)
VALUES 
  -- Chat 1: Газ/нефть
  ('msg-1', 'chat-1', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Привет! Как дела с ценами на нефть?', NOW(), NOW()),
  ('msg-2', 'chat-1', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Интересно, что будет дальше с курсом доллара', NOW() + INTERVAL '1 minute', NOW() + INTERVAL '1 minute'),
  ('msg-3', 'chat-1', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Рекомендую следить за OPEC новостями', NOW() + INTERVAL '2 minutes', NOW() + INTERVAL '2 minutes'),
  
  -- Chat 2: Продуктовый
  ('msg-4', 'chat-2', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Какие акции вы рекомендуете?', NOW() + INTERVAL '3 minutes', NOW() + INTERVAL '3 minutes'),
  ('msg-5', 'chat-2', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Пшеница растёт в цене', NOW() + INTERVAL '4 minutes', NOW() + INTERVAL '4 minutes'),
  
  -- Chat 3: Металлы
  ('msg-6', 'chat-3', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Золото растёт в цене', NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '5 minutes'),
  ('msg-7', 'chat-3', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Серебро тоже показывает рост', NOW() + INTERVAL '6 minutes', NOW() + INTERVAL '6 minutes'),
  
  -- Chat 4: Чат
  ('msg-8', 'chat-4', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Добро пожаловать в RTrader!', NOW() + INTERVAL '7 minutes', NOW() + INTERVAL '7 minutes'),
  ('msg-9', 'chat-4', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Здесь можно обсуждать торговлю и инвестиции', NOW() + INTERVAL '8 minutes', NOW() + INTERVAL '8 minutes'),
  
  -- Chat 5: Технические вопросы
  ('msg-10', 'chat-5', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Как подключиться к API?', NOW() + INTERVAL '9 minutes', NOW() + INTERVAL '9 minutes'),
  ('msg-11', 'chat-5', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Документация находится в разделе Help', NOW() + INTERVAL '10 minutes', NOW() + INTERVAL '10 minutes'),
  
  -- Chat 6: Приходящая (info-only)
  ('msg-12', 'chat-6', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Сигнал: BUY GOLD на уровне 2050', NOW() + INTERVAL '11 minutes', NOW() + INTERVAL '11 minutes'),
  ('msg-13', 'chat-6', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Целевой уровень: 2100, стоп-лосс: 2000', NOW() + INTERVAL '12 minutes', NOW() + INTERVAL '12 minutes'),
  
  -- Chat 7: Интрадей и мысли (info-only)
  ('msg-14', 'chat-7', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Интрадневный анализ: рынок в боковом тренде', NOW() + INTERVAL '13 minutes', NOW() + INTERVAL '13 minutes'),
  ('msg-15', 'chat-7', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Ожидаем пробоя в течение часа', NOW() + INTERVAL '14 minutes', NOW() + INTERVAL '14 minutes'),
  
  -- Chat 8: Видео-разборы (info-only)
  ('msg-16', 'chat-8', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Новое видео: Торговля на уровнях поддержки', NOW() + INTERVAL '15 minutes', NOW() + INTERVAL '15 minutes'),
  ('msg-17', 'chat-8', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', 'Длительность: 25 минут, уровень: средний', NOW() + INTERVAL '16 minutes', NOW() + INTERVAL '16 minutes')
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Insert test subscription
INSERT INTO subscriptions (id, user_id, plan, status, started_at, expires_at, created_at, updated_at)
VALUES (
  'sub-1',
  'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd',
  'premium',
  'active',
  NOW(),
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Insert test chat settings (mute status for all chats)
INSERT INTO chat_settings (chat_id, user_id, is_muted, created_at, updated_at)
VALUES 
  ('chat-1', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', false, NOW(), NOW()),
  ('chat-2', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', false, NOW(), NOW()),
  ('chat-3', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', false, NOW(), NOW()),
  ('chat-4', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', false, NOW(), NOW()),
  ('chat-5', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', false, NOW(), NOW()),
  ('chat-6', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', false, NOW(), NOW()),
  ('chat-7', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', false, NOW(), NOW()),
  ('chat-8', 'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd', false, NOW(), NOW())
ON CONFLICT (chat_id, user_id) DO UPDATE SET updated_at = NOW();
