# Push Notifications Implementation Plan for RTrader Mobile

**Date:** 2026-04-28  
**Status:** Planning Phase

## Overview

Push notifications will be implemented using Expo's built-in push notification service. This allows unified notification handling across Android and iOS platforms without managing FCM/APNs directly.

## Architecture

### Client-Side (React Native App)

1. **Permission Request**: Request user permission to send push notifications on app launch
2. **Token Registration**: Get `ExpoPushToken` from Expo service and store in Supabase
3. **Notification Handlers**: Set up listeners for incoming notifications
4. **Navigation**: Handle notification taps to navigate to relevant screens

### Server-Side (Node.js/Express Backend)

1. **Token Storage**: Store user's `ExpoPushToken` in Supabase `push_tokens` table
2. **Notification Triggers**: Send notifications via Expo Push Service API when:
   - New message arrives in subscribed chat
   - Subscription is about to expire (7 days before)
   - Subscription renewal is approved
   - Admin broadcasts announcement

## Implementation Steps

### Step 1: Install Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
```

### Step 2: Update app.config.ts

Add `expo-notifications` plugin:

```typescript
plugins: [
  "expo-notifications",
  // ... other plugins
]
```

### Step 3: Create Push Token Management Hook

File: `hooks/use-push-notifications.ts`

- Request permission on app launch
- Get `ExpoPushToken` from Expo service
- Store token in Supabase via tRPC endpoint
- Handle notification received events
- Handle notification response events (taps)

### Step 4: Backend Endpoints

#### POST /api/notifications/register-token

Store user's push token in Supabase.

**Request:**
```json
{
  "token": "ExponentPushToken[...]",
  "platform": "android|ios"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token registered"
}
```

#### POST /api/notifications/send

Send notification via Expo Push Service (internal use).

**Request:**
```json
{
  "to": "ExponentPushToken[...]",
  "title": "New message",
  "body": "You have a new message in General",
  "data": {
    "chatId": "chat-general",
    "messageId": "msg-123"
  }
}
```

### Step 5: Notification Triggers

#### 1. New Message Notification

When a message is sent to a chat:
- Query all subscribers of that chat
- Get their push tokens from `push_tokens` table
- Send notification via Expo API

#### 2. Subscription Expiry Warning

Scheduled job (runs daily):
- Query subscriptions expiring in 7 days
- Send notification: "Your subscription expires in 7 days"

#### 3. Subscription Renewal Approved

When admin approves subscription request:
- Send notification: "Your subscription has been renewed until [date]"
- Include deep link to account screen

#### 4. Admin Announcements

Admin can broadcast message to all subscribers:
- Query all active subscribers
- Send notification with announcement text

## Database Schema

### New Table: push_tokens

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_is_active ON push_tokens(is_active);
```

## Security Considerations

1. **Token Validation**: Validate token format before storing
2. **Rate Limiting**: Limit notifications per user per hour
3. **Opt-Out**: Allow users to disable notifications
4. **Data Privacy**: Don't send sensitive data in notification body
5. **Token Rotation**: Invalidate old tokens, refresh periodically

## Testing Strategy

1. **Manual Testing**: Use Expo Notifications Tool to send test notifications
2. **E2E Testing**: Test notification flow from message send to app notification
3. **Device Testing**: Test on real Android and iOS devices
4. **Stress Testing**: Send bulk notifications to test rate limiting

## Rollout Plan

### Phase 1: Development
- Implement client-side token registration
- Set up backend endpoints
- Test with manual notifications

### Phase 2: Beta
- Enable for test accounts
- Monitor notification delivery rates
- Collect user feedback

### Phase 3: Production
- Enable for all subscribers
- Monitor performance and errors
- Adjust notification frequency based on feedback

## Success Metrics

- Notification delivery rate > 95%
- User engagement with notifications > 30%
- Notification-related crashes < 0.1%
- Average notification latency < 5 seconds

## References

- [Expo Push Notifications Documentation](https://docs.expo.dev/push-notifications/overview/)
- [Expo Notifications API Reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Service API](https://docs.expo.dev/push-notifications/sending-notifications/)
