# RTrader Mobile Testing Guide

## Option 1: Using Expo Go (Recommended for Quick Testing)

### Prerequisites
- Install Expo Go on your mobile device:
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Steps

1. **On your mobile device**, open Expo Go app
2. **Tap "Scan QR code"** at the bottom of the home screen
3. **Scan this QR code** (generated from dev server):
   ```
   exps://8081-ixgwtbk0dqqtjg93jxtmv-a065abd4.us2.manus.computer:443
   ```

4. **Wait for the app to load** (first load takes 30-60 seconds)
5. **Login with test credentials**:
   - Email: `demo@rtrader.com`
   - Password: `DemoTest2024!`

### Expected Behavior
- ✅ Login screen appears
- ✅ After login, chats list loads
- ✅ You can open chats and send messages
- ✅ On Android: Press Enter to send messages
- ✅ Author names display correctly

---

## Option 2: Using Expo CLI with Tunnel (If QR Code Doesn't Work)

### On Your Computer (Terminal)

```bash
cd /home/ubuntu/rtrader-mobile

# Start the dev server with tunnel
npx expo start --tunnel

# This will output a URL like:
# exp.host://expo.dev/--/expo-development-client/?url=https://u.expo.dev/...
```

### On Your Mobile Device

1. Open Expo Go
2. Tap "Scan QR code"
3. Scan the QR code shown in terminal output
4. App will load and you can test

---

## Option 3: Manual URL Entry (If Scanning Doesn't Work)

### On Your Mobile Device

1. Open Expo Go
2. Tap "Enter URL" instead of "Scan QR code"
3. Enter: `exps://8081-ixgwtbk0dqqtjg93jxtmv-a065abd4.us2.manus.computer:443`
4. Tap "Open"

---

## Troubleshooting

### "Failed to download remote update"
- **Cause**: Expo Go can't reach the dev server
- **Solution**: 
  - Check your mobile device is on the same network as the dev server
  - Try Option 2 (Tunnel) instead
  - Verify internet connection is working

### "Connection refused"
- **Cause**: Dev server is not running
- **Solution**: Restart the dev server with `pnpm dev`

### App loads but shows "Loading chats..." forever
- **Cause**: Authentication not working on mobile
- **Solution**: This was just fixed! Make sure you're using the latest code by:
  1. Closing Expo Go
  2. Clearing Expo cache: `npx expo start --clear`
  3. Reopening Expo Go and scanning QR code again

### "Please login (10001)" error
- **Cause**: Session not properly set on mobile
- **Solution**: This is fixed in the latest version. Clear cache and try again.

---

## Testing Checklist

After successfully logging in on mobile, verify:

- [ ] Login works with `demo@rtrader.com` / `DemoTest2024!`
- [ ] Chats list loads (should show: Market Analysis, Trading Tips, General)
- [ ] Can tap on a chat to open it
- [ ] Can see messages in the chat
- [ ] Author names display correctly (not "Пользователь")
- [ ] Can type and send a message
- [ ] On Android: Enter key sends the message
- [ ] Keyboard doesn't cover the send button
- [ ] Can reply to messages
- [ ] Can mute/unmute notifications

---

## Dev Server URL

Current dev server is running at:
```
https://8081-ixgwtbk0dqqtjg93jxtmv-a065abd4.us2.manus.computer
```

This URL is valid for this development session. When you restart the dev server, the URL may change.
