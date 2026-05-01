/**
 * Test script for push notifications
 * Sends a test notification via Expo Push API
 */

import axios from "axios";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
  to: string;
  sound: "default" | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
}

async function testPushNotification() {
  console.log("[Push Test] Starting push notification test...");

  // Test token (would come from device registration in real scenario)
  const testToken = process.env.TEST_EXPO_PUSH_TOKEN;

  if (!testToken) {
    console.error(
      "[Push Test] TEST_EXPO_PUSH_TOKEN not set. Cannot test push notifications."
    );
    console.log(
      "[Push Test] To test: export TEST_EXPO_PUSH_TOKEN=ExponentPushToken[...] and run again"
    );
    return {
      success: false,
      reason: "No test token provided",
      instruction:
        "Get a real push token from a device running the app, then set TEST_EXPO_PUSH_TOKEN env var",
    };
  }

  const message: ExpoPushMessage = {
    to: testToken,
    sound: "default",
    title: "RTrader Test",
    body: "This is a test notification from the release build",
    data: {
      chatId: "test-chat-1",
      screen: "chat",
    },
    badge: 1,
  };

  try {
    console.log("[Push Test] Sending notification to:", testToken);
    const response = await axios.post(EXPO_PUSH_API_URL, message, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log("[Push Test] Response status:", response.status);
    console.log("[Push Test] Response data:", JSON.stringify(response.data, null, 2));

    if (response.data.errors && response.data.errors.length > 0) {
      console.error("[Push Test] Errors:", response.data.errors);
      return {
        success: false,
        errors: response.data.errors,
      };
    }

    if (response.data.data && response.data.data.length > 0) {
      const result = response.data.data[0];
      if (result.status === "ok") {
        console.log("[Push Test] ✅ Notification sent successfully!");
        console.log("[Push Test] Ticket ID:", result.id);
        return {
          success: true,
          ticketId: result.id,
          message: "Notification queued for delivery",
        };
      } else {
        console.error("[Push Test] ❌ Notification failed:", result);
        return {
          success: false,
          reason: result.message || "Unknown error",
        };
      }
    }

    return {
      success: false,
      reason: "Unexpected response format",
      response: response.data,
    };
  } catch (error: any) {
    console.error("[Push Test] Error sending notification:", error.message);
    if (error.response) {
      console.error("[Push Test] Response data:", error.response.data);
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run test
testPushNotification()
  .then((result) => {
    console.log("\n[Push Test] Final result:", JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error("[Push Test] Fatal error:", error);
    process.exit(1);
  });
