// //OkraApp\src\services\NotificationService.ts
// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import { Platform } from 'react-native';
// import { logger } from '../utils/logger';
// import DeepLinkService from './DeepLinkService';
// import { EXPO_PUBLIC_PROJECT_ID } from '@utils/constants';

// // Set notification handler
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//     shouldShowBanner: true,
//     shouldShowList: true,
//   }),
// });

// type WebViewSender = (data: any) => void;

// interface RideRequestData {
//   rideId: number | string;
//   rideCode: string;
//   riderName: string;
//   pickupAddress: string;
//   dropoffAddress: string;
//   estimatedFare: number;
//   distance: number;
//   pickupLocation?: {
//     lat: number;
//     lng: number;
//     name?: string;
//     address?: string;
//   };
//   dropoffLocation?: {
//     lat: number;
//     lng: number;
//     name?: string;
//     address?: string;
//   };
// }

// class NotificationService {
//   private notificationToken: string | null = null;
//   private sendToWebView: WebViewSender | null = null;
//   private notificationListener: Notifications.Subscription | null = null;
//   private responseListener: Notifications.Subscription | null = null;

//   /**
//    * Initialize notification service
//    */
//   async initialize(sendToWebView: WebViewSender): Promise<void> {
//     try {
//       logger.info('Initializing notification service');

//       this.sendToWebView = sendToWebView;

//       // Request permissions
//       const { status } = await this.requestPermissions();
      
//       if (status !== 'granted') {
//         logger.warn('Notification permission not granted');
//         return;
//       }

//       // Get notification token
//       await this.registerForPushNotifications();

//       // Setup notification listeners
//       this.setupListeners();

//       logger.info('✅ Notification service initialized');
//     } catch (error) {
//       logger.error('Error initializing notifications:', error);
//     }
//   }

//   /**
//    * Request notification permissions
//    */
//   async requestPermissions(): Promise<{ status: string }> {
//     try {
//       if (!Device.isDevice) {
//         logger.warn('Notifications require physical device');
//         return { status: 'denied' };
//       }

//       const { status: existingStatus } = await Notifications.getPermissionsAsync();
//       let finalStatus = existingStatus;

//       if (existingStatus !== 'granted') {
//         const { status } = await Notifications.requestPermissionsAsync();
//         finalStatus = status;
//       }

//       if (finalStatus !== 'granted') {
//         logger.warn('Notification permission denied');
//         return { status: 'denied' };
//       }

//       logger.info('Notification permission granted');
//       return { status: 'granted' };
//     } catch (error) {
//       logger.error('Error requesting notification permissions:', error);
//       return { status: 'denied' };
//     }
//   }

//   /**
//    * Register for push notifications
//    */
//   async registerForPushNotifications(): Promise<string | null> {
//     try {
//       if (!Device.isDevice) {
//         return null;
//       }

//       // Get Expo push token
//       const token = await Notifications.getExpoPushTokenAsync({
//         projectId: EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
//       });

//       this.notificationToken = token.data;
//       logger.info('Got notification token:', this.notificationToken);

//       // Android-specific channel setup
//       if (Platform.OS === 'android') {
//         await this.setupAndroidChannels();
//       }

//       return this.notificationToken;
//     } catch (error) {
//       logger.error('Error getting push token:', error);
//       return null;
//     }
//   }

//   /**
//    * Setup Android notification channels
//    */
//   private async setupAndroidChannels() {
//     try {
//       // High priority channel for ride requests
//       await Notifications.setNotificationChannelAsync('ride-requests', {
//         name: 'Ride Requests',
//         importance: Notifications.AndroidImportance.MAX,
//         vibrationPattern: [0, 250, 250, 250],
//         sound: 'okra_ride_request_1.wav',
//         lightColor: '#FF6B00',
//         lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
//         bypassDnd: true,
//         enableLights: true,
//         enableVibrate: true,
//         showBadge: true,
//       });

//       // Default channel
//       await Notifications.setNotificationChannelAsync('default', {
//         name: 'Default',
//         importance: Notifications.AndroidImportance.DEFAULT,
//         vibrationPattern: [0, 250, 250, 250],
//         lightColor: '#FF6B00',
//       });

//       // Set up notification categories with action buttons
//       await Notifications.setNotificationCategoryAsync('ride_request', [
//         {
//           identifier: 'accept',
//           buttonTitle: '✅ Accept Ride',
//           options: {
//             opensAppToForeground: true,
//             isDestructive: false,
//             isAuthenticationRequired: false,
//           },
//         },
//         {
//           identifier: 'decline',
//           buttonTitle: '❌ Decline',
//           options: {
//             opensAppToForeground: false,
//             isDestructive: true,
//             isAuthenticationRequired: false,
//           },
//         },
//       ]);

//       logger.info('✅ Android notification channels and categories created');
//     } catch (error) {
//       logger.error('Error setting up Android channels:', error);
//     }
//   }

//   /**
//    * Setup notification listeners
//    */
//   private setupListeners() {
//     // Notification received while app in foreground
//     this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
//       logger.info('📨 Notification received (foreground):', notification.request.content.data);

//       // Send to WebView
//       if (this.sendToWebView) {
//         this.sendToWebView({
//           type: 'NOTIFICATION_RECEIVED',
//           payload: {
//             title: notification.request.content.title,
//             body: notification.request.content.body,
//             data: notification.request.content.data,
//           },
//         });
//       }
//     });

//     // User tapped notification
//     this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
//       logger.info('👆 Notification tapped:', response.notification.request.content.data);

//       const data = response.notification.request.content.data;
//       const actionIdentifier = response.actionIdentifier;

//       // Handle action buttons (Accept/Decline)
//       if (data.type === 'ride_request') {
//         if (actionIdentifier === 'accept') {
//           logger.info('✅ User accepted ride from notification:', data.rideId);
          
//           // Send to WebView
//           if (this.sendToWebView) {
//             this.sendToWebView({
//               type: 'RIDE_ACCEPTED_FROM_NOTIFICATION',
//               payload: {
//                 rideId: data.rideId,
//                 rideCode: data.rideCode,
//                 ...data,
//               },
//             });
//           }
//         } else if (actionIdentifier === 'decline') {
//           logger.info('❌ User declined ride from notification:', data.rideId);
          
//           // Send to WebView
//           if (this.sendToWebView) {
//             this.sendToWebView({
//               type: 'RIDE_DECLINED_FROM_NOTIFICATION',
//               payload: {
//                 rideId: data.rideId,
//                 rideCode: data.rideCode,
//                 ...data,
//               },
//             });
//           }
//         } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
//           // User tapped the notification body (not a button)
//           logger.info('📱 User tapped ride notification:', data.rideId);
          
//           // Send to WebView to open ride details
//           if (this.sendToWebView) {
//             this.sendToWebView({
//               type: 'RIDE_NOTIFICATION_TAPPED',
//               payload: {
//                 rideId: data.rideId,
//                 rideCode: data.rideCode,
//                 ...data,
//               },
//             });
//           }
//         }
//       }

//       // Handle deep linking for other notification types
//       DeepLinkService.handleNotification(data, this.sendToWebView);
//     });

//     logger.info('✅ Notification listeners setup');
//   }

//   /**
//    * Show local notification
//    */
//   async show(notification: {
//     title: string;
//     body: string;
//     data?: any;
//     sound?: string;
//     priority?: 'default' | 'high' | 'max';
//     channelId?: string;
//   }): Promise<void> {
//     try {
//       const notificationContent: Notifications.NotificationContentInput = {
//         title: notification.title,
//         body: notification.body,
//         data: notification.data || {},
//         sound: notification.sound || 'default',
//         priority: notification.priority === 'max' 
//           ? Notifications.AndroidNotificationPriority.MAX 
//           : notification.priority === 'high'
//           ? Notifications.AndroidNotificationPriority.HIGH
//           : Notifications.AndroidNotificationPriority.DEFAULT,
//       };

//       const notificationRequest: Notifications.NotificationRequestInput = {
//         content: notificationContent,
//         trigger: null, // Show immediately
//       };

//       // Set identifier if channelId provided
//       if (Platform.OS === 'android' && notification.channelId) {
//         notificationRequest.identifier = notification.channelId;
//       }

//       await Notifications.scheduleNotificationAsync(notificationRequest);

//       logger.info('✅ Notification shown:', notification.title);
//     } catch (error) {
//       logger.error('❌ Error showing notification:', error);
//     }
//   }

//   /**
//    * Show high-priority notification (for ride requests)
//    */
//   async showHighPriority(notification: {
//     title: string;
//     body: string;
//     data: any;
//   }): Promise<void> {
//     await this.show({
//       ...notification,
//       priority: 'max',
//       channelId: 'ride-requests',
//       sound: 'okra_ride_request_1.wav',
//     });
//   }

//   /**
//    * Show ride request notification with action buttons
//    * NEW METHOD - specifically for ride requests with Accept/Decline buttons
//    */
//   async showRideRequest(data: RideRequestData): Promise<void> {
//     try {
//       logger.info('🚗 Showing ride request notification:', data.rideCode);

//       // For Android, we need to schedule with explicit settings
//       if (Platform.OS === 'android') {
//         const notificationId = await Notifications.scheduleNotificationAsync({
//           content: {
//             title: '🚗 New Ride Request!',
//             body: `${data.rideCode} - ${data.riderName}\n📍 ${data.pickupAddress}\n🎯 ${data.dropoffAddress}\n💰 K${data.estimatedFare.toFixed(2)} • ${data.distance.toFixed(1)} km`,
//             data: {
//               type: 'ride_request',
//               rideId: data.rideId,
//               rideCode: data.rideCode,
//               riderName: data.riderName,
//               pickupAddress: data.pickupAddress,
//               dropoffAddress: data.dropoffAddress,
//               estimatedFare: data.estimatedFare,
//               distance: data.distance,
//               pickupLocation: data.pickupLocation,
//               dropoffLocation: data.dropoffLocation,
//             },
//             sound: 'okra_ride_request_1.wav',
//             priority: Notifications.AndroidNotificationPriority.MAX,
//             categoryIdentifier: 'ride_request',
//             badge: 1,
//             vibrate: [0, 250, 250, 250],
//           },
//           trigger: null,
//           identifier: `ride-${data.rideId}`,
//         });

//         logger.info('✅ Android ride request notification shown with ID:', notificationId);
//       } else {
//         // iOS
//         const notificationId = await Notifications.scheduleNotificationAsync({
//           content: {
//             title: '🚗 New Ride Request!',
//             body: `${data.rideCode} - ${data.riderName}\n📍 ${data.pickupAddress}\n🎯 ${data.dropoffAddress}\n💰 K${data.estimatedFare.toFixed(2)} • ${data.distance.toFixed(1)} km`,
//             data: {
//               type: 'ride_request',
//               rideId: data.rideId,
//               rideCode: data.rideCode,
//               riderName: data.riderName,
//               pickupAddress: data.pickupAddress,
//               dropoffAddress: data.dropoffAddress,
//               estimatedFare: data.estimatedFare,
//               distance: data.distance,
//               pickupLocation: data.pickupLocation,
//               dropoffLocation: data.dropoffLocation,
//             },
//             sound: 'okra_ride_request_1.wav',
//             categoryIdentifier: 'ride_request',
//             badge: 1,
//           },
//           trigger: null,
//         });

//         logger.info('✅ iOS ride request notification shown with ID:', notificationId);
//       }

//       // Send to WebView as well (for when app is in foreground)
//       if (this.sendToWebView) {
//         this.sendToWebView({
//           type: 'RIDE_REQUEST_NOTIFICATION_SHOWN',
//           payload: {
//             ...data,
//           },
//         });
//       }
//     } catch (error) {
//       logger.error('❌ Error showing ride request notification:', error);
//     }
//   }

//   /**
//    * Cancel all notifications
//    */
//   async cancelAll(): Promise<void> {
//     try {
//       await Notifications.cancelAllScheduledNotificationsAsync();
//       await Notifications.dismissAllNotificationsAsync();
//       logger.info('✅ All notifications cancelled');
//     } catch (error) {
//       logger.error('❌ Error cancelling notifications:', error);
//     }
//   }

//   /**
//    * Cancel specific notification
//    */
//   async cancel(notificationId: string): Promise<void> {
//     try {
//       await Notifications.dismissNotificationAsync(notificationId);
//       logger.info('✅ Notification cancelled:', notificationId);
//     } catch (error) {
//       logger.error('❌ Error cancelling notification:', error);
//     }
//   }

//   /**
//    * Get notification token
//    */
//   getToken(): string | null {
//     return this.notificationToken;
//   }

//   /**
//    * Handle background notification (when app is killed/backgrounded)
//    */
//   async handleBackgroundNotification(notification: any): Promise<void> {
//     try {
//       logger.info('📱 Handling background notification:', notification.data);

//       const data = notification.data;

//       // Handle specific actions
//       if (data.type === 'reconnect') {
//         // Socket reconnection logic will be handled by App.tsx
//         logger.info('🔄 Reconnect notification received');
//       } else if (data.type === 'wake_up') {
//         // Location update will be handled by LocationService
//         logger.info('⏰ Wake up notification received');
//       } else if (data.type === 'ride_request') {
//         // Ride request notification - show it
//         logger.info('🚗 Ride request notification in background');
//         await this.showRideRequest(data);
//       }
//     } catch (error) {
//       logger.error('❌ Error handling background notification:', error);
//     }
//   }

//   /**
//    * Check if notification service is ready
//    */
//   isReady(): boolean {
//     return this.notificationToken !== null;
//   }

//   /**
//    * Cleanup
//    */
//   cleanup() {
//     if (this.notificationListener) {
//       this.notificationListener.remove();
//       this.notificationListener = null;
//     }
//     if (this.responseListener) {
//       this.responseListener.remove();
//       this.responseListener = null;
//     }
//     logger.info('✅ Notification service cleaned up');
//   }
// }

// export default new NotificationService();
//OkraApp\src\services\NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';
import DeepLinkService from './DeepLinkService';
import { EXPO_PUBLIC_PROJECT_ID } from '@utils/constants';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type WebViewSender = (data: any) => void;

interface RideRequestData {
  rideId: number | string;
  rideCode: string;
  riderName: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  distance: number;
  pickupLocation?: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
  dropoffLocation?: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
}

interface DeliveryRequestData {
  deliveryId: number | string;
  rideCode?: string;
  senderName?: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  distance: number;
  pickupLocation?: { lat: number; lng: number; name?: string; address?: string };
  dropoffLocation?: { lat: number; lng: number; name?: string; address?: string };
  packageType?: string | null;
  isFragile?: boolean;
  weightKg?: number | null;
  recipientName?: string | null;
}

class NotificationService {
  private notificationToken: string | null = null;
  private sendToWebView: WebViewSender | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Initialize notification service
   */
  async initialize(sendToWebView: WebViewSender): Promise<void> {
    try {
      logger.info('Initializing notification service');

      this.sendToWebView = sendToWebView;

      // Request permissions
      const { status } = await this.requestPermissions();

      if (status !== 'granted') {
        logger.warn('Notification permission not granted');
        return;
      }

      // Get notification token
      await this.registerForPushNotifications();

      // Setup notification listeners
      this.setupListeners();

      // Register action button categories for both iOS and Android
      await this.registerNotificationCategories();

      logger.info('✅ Notification service initialized');
    } catch (error) {
      logger.error('Error initializing notifications:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<{ status: string }> {
    try {
      if (!Device.isDevice) {
        logger.warn('Notifications require physical device');
        return { status: 'denied' };
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('Notification permission denied');
        return { status: 'denied' };
      }

      logger.info('Notification permission granted');
      return { status: 'granted' };
    } catch (error) {
      logger.error('Error requesting notification permissions:', error);
      return { status: 'denied' };
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
      });

      this.notificationToken = token.data;
      logger.info('Got notification token:', this.notificationToken);

      // Android-specific channel setup
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return this.notificationToken;
    } catch (error) {
      logger.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Setup Android notification channels only (no categories here)
   */
  private async setupAndroidChannels() {
    try {
      // High priority channel for ride requests
      await Notifications.setNotificationChannelAsync('ride-requests', {
        name: 'Ride Requests',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'okra_ride_request_1.wav',
        lightColor: '#FF6B00',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      // Default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B00',
      });

      logger.info('✅ Android notification channels created');
    } catch (error) {
      logger.error('Error setting up Android channels:', error);
    }
  }

  /**
   * Register notification categories with Accept/Decline action buttons.
   *
   * Both buttons use opensAppToForeground: true so the app is always in the
   * foreground when the response listener fires. Without this the WebView
   * hasn't mounted yet and sendToWebView silently fails ("permission not set").
   * The in-app ride/delivery modal handles the actual accept or decline action.
   */
  private async registerNotificationCategories(): Promise<void> {
    try {
      // Single action — opens the app so the in-app modal handles both
      // accept and decline. Two separate buttons are removed on purpose:
      // tapping from the notification shade still requires the WebView to
      // be mounted, so one CTA that always brings the app to the foreground
      // is the correct pattern.
      await Notifications.setNotificationCategoryAsync('ride_request', [
        {
          identifier: 'open',
          buttonTitle: 'Tap to Accept or Decline Ride',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('delivery_request', [
        {
          identifier: 'open',
          buttonTitle: 'Tap to Accept or Decline Delivery',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);

      logger.info('✅ Notification categories registered (ride_request + delivery_request)');
    } catch (error) {
      logger.error('Error registering notification categories:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupListeners() {
    // Notification received while app in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      logger.info('📨 Notification received (foreground):', notification.request.content.data);

      if (this.sendToWebView) {
        this.sendToWebView({
          type: 'NOTIFICATION_RECEIVED',
          payload: {
            title: notification.request.content.title,
            body: notification.request.content.body,
            data: notification.request.content.data,
          },
        });
      }
    });

    // User tapped notification or tapped an action button
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      logger.info('👆 Notification tapped:', response.notification.request.content.data);

      const data = response.notification.request.content.data;
      const actionIdentifier = response.actionIdentifier;

      // ── Ride request actions ──────────────────────────────────────────────
      if (data.type === 'ride_request') {
        // Both the 'open' action button and tapping the notification body
        // bring the app to the foreground — the modal handles everything.
        if (
          actionIdentifier === 'open' ||
          actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
        ) {
          logger.info('📱 User tapped ride notification — opening modal:', data.rideId);
          if (this.sendToWebView) {
            this.sendToWebView({
              type: 'RIDE_NOTIFICATION_TAPPED',
              payload: { rideId: data.rideId, rideCode: data.rideCode, ...data },
            });
          }
        }
      }

      // ── Delivery request actions ──────────────────────────────────────────
      if (data.type === 'delivery_request') {
        // Same pattern as ride_request — one button, app modal handles the rest.
        if (
          actionIdentifier === 'open' ||
          actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
        ) {
          logger.info('📱 User tapped delivery notification — opening modal:', data.deliveryId);
          if (this.sendToWebView) {
            this.sendToWebView({
              type: 'DELIVERY_NOTIFICATION_TAPPED',
              payload: { deliveryId: data.deliveryId, rideCode: data.rideCode, ...data },
            });
          }
        }
      }

      // Handle deep linking for other notification types
      DeepLinkService.handleNotification(data, this.sendToWebView);
    });

    logger.info('✅ Notification listeners setup');
  }

  /**
   * Show local notification
   */
  async show(notification: {
    title: string;
    body: string;
    data?: any;
    sound?: string;
    priority?: 'default' | 'high' | 'max';
    channelId?: string;
  }): Promise<void> {
    try {
      const notificationContent: Notifications.NotificationContentInput = {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: notification.sound || 'default',
        priority: notification.priority === 'max'
          ? Notifications.AndroidNotificationPriority.MAX
          : notification.priority === 'high'
          ? Notifications.AndroidNotificationPriority.HIGH
          : Notifications.AndroidNotificationPriority.DEFAULT,
      };

      const notificationRequest: Notifications.NotificationRequestInput = {
        content: notificationContent,
        trigger: null,
      };

      if (Platform.OS === 'android' && notification.channelId) {
        notificationRequest.identifier = notification.channelId;
      }

      await Notifications.scheduleNotificationAsync(notificationRequest);

      logger.info('✅ Notification shown:', notification.title);
    } catch (error) {
      logger.error('❌ Error showing notification:', error);
    }
  }

  /**
   * Show high-priority notification
   */
  async showHighPriority(notification: {
    title: string;
    body: string;
    data: any;
  }): Promise<void> {
    await this.show({
      ...notification,
      priority: 'max',
      channelId: 'ride-requests',
      sound: 'okra_ride_request_1.wav',
    });
  }

  /**
   * Show ride request notification with Accept / Decline action buttons
   */
  async showRideRequest(data: RideRequestData): Promise<void> {
    try {
      logger.info('🚗 Showing ride request notification:', data.rideCode);

      const content: Notifications.NotificationContentInput = {
        title: '🚗 New Ride Request!',
        body: `${data.rideCode} - ${data.riderName}\n📍 ${data.pickupAddress}\n🎯 ${data.dropoffAddress}\n💰 K${data.estimatedFare.toFixed(2)} • ${data.distance.toFixed(1)} km`,
        data: {
          type: 'ride_request',
          rideId: data.rideId,
          rideCode: data.rideCode,
          riderName: data.riderName,
          pickupAddress: data.pickupAddress,
          dropoffAddress: data.dropoffAddress,
          estimatedFare: data.estimatedFare,
          distance: data.distance,
          pickupLocation: data.pickupLocation,
          dropoffLocation: data.dropoffLocation,
        },
        sound: 'okra_ride_request_1.wav',
        categoryIdentifier: 'ride_request',
        badge: 1,
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
        }),
      };

      await Notifications.scheduleNotificationAsync({
        content,
        trigger: null,
        identifier: `ride-${data.rideId}`,
      });

      logger.info('✅ Ride request notification shown');

      if (this.sendToWebView) {
        this.sendToWebView({
          type: 'RIDE_REQUEST_NOTIFICATION_SHOWN',
          payload: { ...data },
        });
      }
    } catch (error) {
      logger.error('❌ Error showing ride request notification:', error);
    }
  }

  /**
   * Show delivery request notification with Accept / Decline action buttons
   */
  async showDeliveryRequest(data: DeliveryRequestData): Promise<void> {
    try {
      logger.info('📦 Showing delivery request notification:', data.rideCode);

      const content: Notifications.NotificationContentInput = {
        title: '📦 New Delivery Request!',
        body: `${data.rideCode ?? ''} - ${data.senderName ?? 'Sender'}\n📍 ${data.pickupAddress}\n🎯 ${data.dropoffAddress}\n💰 K${data.estimatedFare.toFixed(2)} • ${data.distance.toFixed(1)} km`,
        data: {
          type: 'delivery_request',
          deliveryId: data.deliveryId,
          rideCode: data.rideCode,
          senderName: data.senderName,
          pickupAddress: data.pickupAddress,
          dropoffAddress: data.dropoffAddress,
          estimatedFare: data.estimatedFare,
          distance: data.distance,
          pickupLocation: data.pickupLocation,
          dropoffLocation: data.dropoffLocation,
          packageType: data.packageType,
          isFragile: data.isFragile,
          weightKg: data.weightKg,
          recipientName: data.recipientName,
        },
        sound: 'okra_ride_request_1.wav',
        categoryIdentifier: 'delivery_request',
        badge: 1,
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
        }),
      };

      await Notifications.scheduleNotificationAsync({
        content,
        trigger: null,
        identifier: `delivery-${data.deliveryId}`,
      });

      logger.info('✅ Delivery request notification shown');

      if (this.sendToWebView) {
        this.sendToWebView({
          type: 'DELIVERY_REQUEST_NOTIFICATION_SHOWN',
          payload: { ...data },
        });
      }
    } catch (error) {
      logger.error('❌ Error showing delivery request notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      logger.info('✅ All notifications cancelled');
    } catch (error) {
      logger.error('❌ Error cancelling notifications:', error);
    }
  }

  /**
   * Cancel specific notification
   */
  async cancel(notificationId: string): Promise<void> {
    try {
      await Notifications.dismissNotificationAsync(notificationId);
      logger.info('✅ Notification cancelled:', notificationId);
    } catch (error) {
      logger.error('❌ Error cancelling notification:', error);
    }
  }

  /**
   * Get notification token
   */
  getToken(): string | null {
    return this.notificationToken;
  }

  /**
   * Handle background notification (when app is killed/backgrounded)
   */
  async handleBackgroundNotification(notification: any): Promise<void> {
    try {
      logger.info('📱 Handling background notification:', notification.data);

      const data = notification.data;

      if (data.type === 'reconnect') {
        logger.info('🔄 Reconnect notification received');
      } else if (data.type === 'wake_up') {
        logger.info('⏰ Wake up notification received');
      } else if (data.type === 'ride_request') {
        logger.info('🚗 Ride request notification in background');
        await this.showRideRequest(data);
      } else if (data.type === 'delivery_request') {
        logger.info('📦 Delivery request notification in background');
        await this.showDeliveryRequest(data);
      }
    } catch (error) {
      logger.error('❌ Error handling background notification:', error);
    }
  }

  /**
   * Check if notification service is ready
   */
  isReady(): boolean {
    return this.notificationToken !== null;
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    logger.info('✅ Notification service cleaned up');
  }
}

export default new NotificationService();