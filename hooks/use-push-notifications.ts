import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from './use-auth';
import { useMutation } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api-rest';

// Set default notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook to manage push notifications
 * - Requests permission on app launch
 * - Gets and stores push token
 * - Sets up notification listeners
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const registerTokenMutation = useMutation({
    mutationFn: (input: { token: string; platform: 'ios' | 'android' | 'web' }) =>
      notificationsApi.registerToken(input.token, input.platform),
  });

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const setupNotifications = async () => {
      try {
        // Set up Android notification channel
        if (Device.osName === 'Android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#00FF00',
            enableVibrate: true,
            enableLights: true,
          });
        }

        // Request permission and get token
        const token = await registerForPushNotificationsAsync();
        
        if (isMounted && token) {
          // Store token in backend
          await registerTokenMutation.mutateAsync({
            token,
            platform: Device.osName === 'Android' ? 'android' : Device.osName === 'iOS' ? 'ios' : 'web',
          });
        }

        // Set up notification received listener
        notificationListener.current = Notifications.addNotificationReceivedListener(
          (notification) => {
            console.log('[Notification Received]', notification);
            // Handle notification received while app is in foreground
            // The default handler will show the notification banner
          }
        );

        // Set up notification response listener (when user taps notification)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            console.log('[Notification Response]', response);
            const { notification } = response;
            const data = notification.request.content.data;

            // Handle navigation based on notification data
            if (data.chatId) {
              // Navigate to chat screen
              // This will be handled by the app router
            } else if (data.screen) {
              // Navigate to specific screen
              // This will be handled by the app router
            }
          }
        );
      } catch (error) {
        console.error('[Push Notifications Error]', error);
      }
    };

    setupNotifications();

    return () => {
      isMounted = false;
      // Clean up listeners
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user, registerTokenMutation]);
}

/**
 * Register for push notifications and get token
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push Notifications] Must use physical device for push notifications');
    return null;
  }

  try {
    // Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If permission denied, return null
    if (finalStatus !== 'granted') {
      console.log('[Push Notifications] Permission not granted');
      return null;
    }

    // Get project ID from constants
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    if (!projectId) {
      console.error('[Push Notifications] Project ID not found');
      return null;
    }

    // Get push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenResponse.data;
    console.log('[Push Notifications] Token:', token);
    return token;
  } catch (error) {
    console.error('[Push Notifications] Error getting token:', error);
    return null;
  }
}
