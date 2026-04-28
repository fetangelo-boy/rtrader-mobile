# RTrader Chats Structure

## Chats Table Overview

The `chats` table contains 14 chats with two types:

### Interactive Chats (type = "interactive")
Users can post messages freely. Admins can also post.

1. **Trading Tips** - Share trading strategies
2. **Test Chat** - Test
3. **General** - General discussion
4. **Market Analysis** - Discuss market trends
5. **Газ/нефть** - Обсуждение энергоносителей и цен на нефть
6. **Продуктовый** - Торговля продовольственными товарами
7. **Металлы** - Драгоценные и промышленные металлы
8. **Сельхоз** - Сельскохозяйственные товары и урожаи
9. **Валюта** - Обсуждение валютных пар и курсов

### Info-Only Chats (type = "info_only")
Only admins can post. Regular users can only read.

1. **Новости рынка** (chat-6) - Последние новости с финансовых рынков
2. **Аналитика** (chat-7) - Глубокий анализ и прогнозы трейдеров
3. **Образование** (chat-8) - Обучение трейдингу и инвестициям

## RLS Policy Applied

Migration `20260428190000_allow_admin_post_info_only.sql` was applied to enforce:
- **Admins**: Can post in both `interactive` and `info_only` chats
- **Subscribers**: Can post only in `interactive` chats (not in `info_only`)
- **Other users**: Cannot post in any chat

## Next Steps

1. Implement push notifications for new messages in chats
2. Test notification delivery to subscribers
3. Verify RLS policies are working correctly
