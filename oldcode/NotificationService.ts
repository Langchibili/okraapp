// //OkraApp\src\services\NotificationService.ts
// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import { Platform } from 'react-native';
// import { logger } from '../utils/logger';
// import DeepLinkService from './DeepLinkService';

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
//         projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
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
//     // High priority channel for ride requests
//     await Notifications.setNotificationChannelAsync('ride-requests', {
//       name: 'Ride Requests',
//       importance: Notifications.AndroidImportance.MAX,
//       vibrationPattern: [0, 250, 250, 250],
//       sound: 'ride_request.wav',
//       lightColor: '#FF6B00',
//       lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
//       bypassDnd: true,
//     });

//     // Default channel
//     await Notifications.setNotificationChannelAsync('default', {
//       name: 'Default',
//       importance: Notifications.AndroidImportance.DEFAULT,
//       vibrationPattern: [0, 250, 250, 250],
//       lightColor: '#FF6B00',
//     });

//     logger.info('Android notification channels created');
//   }

//   /**
//    * Setup notification listeners
//    */
//   private setupListeners() {
//     // Notification received while app in foreground
//     this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
//       logger.info('Notification received (foreground):', notification.request.content.data);

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
//       logger.info('Notification tapped:', response.notification.request.content.data);

//       const data = response.notification.request.content.data;

//       // Handle deep linking
//       DeepLinkService.handleNotification(data, this.sendToWebView);
//     });

//     logger.info('Notification listeners setup');
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
//       const channelId = notification.channelId || 
//         (notification.priority === 'high' || notification.priority === 'max' ? 'ride-requests' : 'default');

//       await Notifications.scheduleNotificationAsync({
//         content: {
//           title: notification.title,
//           body: notification.body,
//           data: notification.data || {},
//           sound: notification.sound || 'default',
//           priority: notification.priority === 'max' 
//             ? Notifications.AndroidNotificationPriority.MAX 
//             : notification.priority === 'high'
//             ? Notifications.AndroidNotificationPriority.HIGH
//             : Notifications.AndroidNotificationPriority.DEFAULT,
//         },
//         trigger: null, // Show immediately
//       });

//       logger.info('Notification shown:', notification.title);
//     } catch (error) {
//       logger.error('Error showing notification:', error);
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
//       sound: 'ride_request.wav',
//     });
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
//       logger.info('Handling background notification:', notification.data);

//       const data = notification.data;

//       // Handle specific actions
//       if (data.type === 'reconnect') {
//         // Socket reconnection logic will be handled by App.tsx
//         logger.info('Reconnect notification received');
//       } else if (data.type === 'wake_up') {
//         // Location update will be handled by LocationService
//         logger.info('Wake up notification received');
//       }
//     } catch (error) {
//       logger.error('Error handling background notification:', error);
//     }
//   }

//   /**
//    * Cleanup
//    */
//   cleanup() {
//     if (this.notificationListener) {
//       this.notificationListener.remove();
//     }
//     if (this.responseListener) {
//       this.responseListener.remove();
//     }
//   }
// }

// export default new NotificationService();