// // // // // // // // import React, { useRef, useEffect, useState, useCallback } from 'react';
// // // // // // // // import {
// // // // // // // //   SafeAreaView,
// // // // // // // //   StatusBar,
// // // // // // // //   Platform,
// // // // // // // //   AppState,
// // // // // // // //   StyleSheet,
// // // // // // // //   View,
// // // // // // // //   Text,                    
// // // // // // // //   ActivityIndicator,
// // // // // // // // } from 'react-native';
// // // // // // // // import { WebView } from 'react-native-webview';
// // // // // // // // import * as Notifications from 'expo-notifications';
// // // // // // // // import * as TaskManager from 'expo-task-manager';
// // // // // // // // import NetInfo from '@react-native-community/netinfo';

// // // // // // // // import BackgroundService from './src/services/BackgroundService';
// // // // // // // // import DeviceSocketService from './src/services/DeviceSocketService';
// // // // // // // // import LocationService from './src/services/LocationService';
// // // // // // // // import NotificationService from './src/services/NotificationService';
// // // // // // // // import PermissionManager from './src/services/PermissionManager';
// // // // // // // // import AudioService from './src/services/AudioService';
// // // // // // // // import DeepLinkService from './src/services/DeepLinkService';
// // // // // // // // import { getDeviceInfo } from './src/utils/device-info';
// // // // // // // // import { logger } from './src/utils/logger';
// // // // // // // // import { NavigationHelper } from './src/utils/navigation';
// // // // // // // // import { CONSTANTS } from './src/utils/constants';
// // // // // // // // import type { WebViewMessage } from './src/types/messages';
// // // // // // // // import OkraSkeletonLoader from '@components/OkraSkeletonLoader';

// // // // // // // // // Define background notification task
// // // // // // // // TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
// // // // // // // //   if (error) {
// // // // // // // //     logger.error('Background notification task error:', error);
// // // // // // // //     return;
// // // // // // // //   }

// // // // // // // //   if (data) {
// // // // // // // //     await NotificationService.handleBackgroundNotification(data);
// // // // // // // //   }
// // // // // // // // });

// // // // // // // // const FRONTEND_URL = __DEV__
// // // // // // // //   ? Platform.OS === 'android'
// // // // // // // //     ? 'http://10.64.246.23:3000' // Android emulator
// // // // // // // //     : 'http://10.64.246.23:3000' // iOS simulator
// // // // // // // //   : CONSTANTS.FRONTEND_URLS.landing;

// // // // // // // // export default function App() {
// // // // // // // //   const webViewRef = useRef<WebView>(null);
// // // // // // // //   const [appState, setAppState] = useState(AppState.currentState);
// // // // // // // //   const [servicesInitialized, setServicesInitialized] = useState(false);
// // // // // // // //   const [isLoading, setIsLoading] = useState(true);
// // // // // // // //   const [hasError, setHasError] = useState(false);
// // // // // // // //   const [isConnected, setIsConnected] = useState(true);
  
// // // // // // // //   const deviceIdRef = useRef<string | null>(null);
// // // // // // // //   const userIdRef = useRef<string | number | null>(null);
// // // // // // // //   const frontendNameRef = useRef<string | null>(null);

// // // // // // // //   // Send message to WebView
// // // // // // // //   const sendToWebView = useCallback((data: any) => {
// // // // // // // //     if (!webViewRef.current) {
// // // // // // // //       logger.warn('Cannot send to WebView: ref is null');
// // // // // // // //       return;
// // // // // // // //     }

// // // // // // // //     NavigationHelper.sendMessage(webViewRef, data.type, data.payload);
// // // // // // // //   }, []);

// // // // // // // //   // Initialize notification service on mount
// // // // // // // //   useEffect(() => {
// // // // // // // //     const initNotifications = async () => {
// // // // // // // //       await NotificationService.initialize(sendToWebView);
// // // // // // // //     };

// // // // // // // //     initNotifications();

// // // // // // // //     return () => {
// // // // // // // //       NotificationService.cleanup();
// // // // // // // //     };
// // // // // // // //   }, [sendToWebView]);

// // // // // // // //   // Monitor network connectivity
// // // // // // // //   useEffect(() => {
// // // // // // // //     const unsubscribe = NetInfo.addEventListener(state => {
// // // // // // // //       setIsConnected(state.isConnected ?? false);
      
// // // // // // // //       if (state.isConnected && servicesInitialized) {
// // // // // // // //         // Reconnect socket if disconnected
// // // // // // // //         if (!DeviceSocketService.isConnected()) {
// // // // // // // //           logger.info('Network restored, reconnecting socket...');
// // // // // // // //           DeviceSocketService.reconnect();
// // // // // // // //         }
// // // // // // // //       }
// // // // // // // //     });

// // // // // // // //     return () => unsubscribe();
// // // // // // // //   }, [servicesInitialized]);

// // // // // // // //   // Handle App State Changes
// // // // // // // //   useEffect(() => {
// // // // // // // //     const subscription = AppState.addEventListener('change', async (nextAppState) => {
// // // // // // // //       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

// // // // // // // //       if (appState.match(/inactive|background/) && nextAppState === 'active') {
// // // // // // // //         // App came to foreground
// // // // // // // //         logger.info('App resumed to foreground');

// // // // // // // //         // Check socket connection health
// // // // // // // //         if (servicesInitialized && !DeviceSocketService.isConnected()) {
// // // // // // // //           logger.warn('Socket disconnected, attempting reconnect');
// // // // // // // //           await DeviceSocketService.reconnect();
// // // // // // // //         }

// // // // // // // //         // Notify WebView
// // // // // // // //         sendToWebView({ type: 'APP_RESUMED', payload: {} });
// // // // // // // //       } else if (nextAppState === 'background') {
// // // // // // // //         logger.info('App moved to background');
        
// // // // // // // //         // Ensure background service is running (Android)
// // // // // // // //         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
// // // // // // // //           await BackgroundService.ensureForegroundService();
// // // // // // // //         }
// // // // // // // //       }

// // // // // // // //       setAppState(nextAppState);
// // // // // // // //     });

// // // // // // // //     return () => subscription.remove();
// // // // // // // //   }, [appState, servicesInitialized, sendToWebView]);

// // // // // // // //   // Setup Socket Listeners (called after initialization)
// // // // // // // //   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
// // // // // // // //     logger.info(`Setting up socket listeners for ${frontendName}`);

// // // // // // // //     // Listen for location requests from backend
// // // // // // // //     DeviceSocketService.on('getCurrentLocation', async () => {
// // // // // // // //       logger.info('Received location request from backend');
// // // // // // // //       try {
// // // // // // // //         const location = await LocationService.getCurrentLocation();
// // // // // // // //         if (location) {
// // // // // // // //           await DeviceSocketService.emit('device:location:update', {
// // // // // // // //             deviceId,
// // // // // // // //             location: {
// // // // // // // //               lat: location.coords.latitude,
// // // // // // // //               lng: location.coords.longitude,
// // // // // // // //               accuracy: location.coords.accuracy,
// // // // // // // //               altitude: location.coords.altitude,
// // // // // // // //               altitudeAccuracy: location.coords.altitudeAccuracy,
// // // // // // // //               heading: location.coords.heading,
// // // // // // // //               speed: location.coords.speed,
// // // // // // // //             },
// // // // // // // //             timestamp: location.timestamp,
// // // // // // // //           });

// // // // // // // //           // Also notify WebView
// // // // // // // //           sendToWebView({
// // // // // // // //             type: 'LOCATION_UPDATE',
// // // // // // // //             payload: {
// // // // // // // //               lat: location.coords.latitude,
// // // // // // // //               lng: location.coords.longitude,
// // // // // // // //               accuracy: location.coords.accuracy,
// // // // // // // //               heading: location.coords.heading,
// // // // // // // //               speed: location.coords.speed,
// // // // // // // //             },
// // // // // // // //           });
// // // // // // // //         }
// // // // // // // //       } catch (error) {
// // // // // // // //         logger.error('Error getting location on request:', error);
// // // // // // // //       }
// // // // // // // //     });

// // // // // // // //     // Listen for notifications
// // // // // // // //     DeviceSocketService.on('showNotification', async (notification: any) => {
// // // // // // // //       logger.info('Received notification request:', notification.type);
// // // // // // // //       await NotificationService.show(notification);

// // // // // // // //       // Notify WebView
// // // // // // // //       sendToWebView({
// // // // // // // //         type: 'NOTIFICATION_RECEIVED',
// // // // // // // //         payload: notification,
// // // // // // // //       });
// // // // // // // //     });

// // // // // // // //     // Listen for draw-over requests (Android only, non-rider)
// // // // // // // //     if (Platform.OS === 'android' && frontendName !== 'rider') {
// // // // // // // //       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
// // // // // // // //         logger.info('Received draw-over request');

// // // // // // // //         // Check if shouldDrawOver flag is set
// // // // // // // //         if (overlayData.shouldDrawOver === false) {
// // // // // // // //           logger.info('shouldDrawOver is false, skipping overlay');
          
// // // // // // // //           // Still show notification and notify WebView
// // // // // // // //           await NotificationService.showHighPriority({
// // // // // // // //             title: 'New Ride Request',
// // // // // // // //             body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // // // // // //             data: overlayData,
// // // // // // // //           });
          
// // // // // // // //           sendToWebView({
// // // // // // // //             type: 'RIDE_REQUEST',
// // // // // // // //             payload: overlayData,
// // // // // // // //           });
          
// // // // // // // //           return;
// // // // // // // //         }

// // // // // // // //         // Play audio alert
// // // // // // // //         await AudioService.playAlert("ride_request");

// // // // // // // //         // Show overlay if permission granted
// // // // // // // //         const hasPermission = await PermissionManager.checkDrawOverPermission();
// // // // // // // //         if (hasPermission) {
// // // // // // // //           await BackgroundService.showDrawOver(overlayData);
// // // // // // // //         }

// // // // // // // //         // Show high-priority notification
// // // // // // // //         await NotificationService.showHighPriority({
// // // // // // // //           title: 'New Ride Request',
// // // // // // // //           body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // // // // // //           data: overlayData,
// // // // // // // //         });

// // // // // // // //         // Always notify WebView (even if overlay not shown)
// // // // // // // //         sendToWebView({
// // // // // // // //           type: 'RIDE_REQUEST',
// // // // // // // //           payload: overlayData,
// // // // // // // //         });
// // // // // // // //       });
// // // // // // // //     }

// // // // // // // //     // Listen for socket connection status
// // // // // // // //     DeviceSocketService.on('connected', () => {
// // // // // // // //       logger.info('Device socket connected');
// // // // // // // //       sendToWebView({ type: 'SOCKET_CONNECTED', payload: {} });
// // // // // // // //     });

// // // // // // // //     DeviceSocketService.on('disconnected', (reason: string) => {
// // // // // // // //       logger.warn('Device socket disconnected:', reason);
// // // // // // // //       sendToWebView({
// // // // // // // //         type: 'SOCKET_DISCONNECTED',
// // // // // // // //         payload: { reason },
// // // // // // // //       });
// // // // // // // //     });
// // // // // // // //   }, [sendToWebView]);

// // // // // // // //   // Handle messages from WebView
// // // // // // // //   const onMessage = async (event: any) => {
// // // // // // // //     try {
// // // // // // // //       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
// // // // // // // //       const { type, requestId, payload } = message;

// // // // // // // //       logger.info(`Received message from WebView: ${type}`);

// // // // // // // //       let response: any = null;

// // // // // // // //       switch (type) {
// // // // // // // //         case 'INITIALIZE_SERVICES':
// // // // // // // //           response = await handleInitializeServices(payload);
// // // // // // // //           break;

// // // // // // // //         case 'REQUEST_PERMISSION':
// // // // // // // //           response = await handleRequestPermission(payload);
// // // // // // // //           break;

// // // // // // // //         case 'CHECK_PERMISSION':
// // // // // // // //           response = await handleCheckPermission(payload);
// // // // // // // //           break;

// // // // // // // //         case 'GET_CURRENT_LOCATION':
// // // // // // // //           response = await handleGetCurrentLocation();
// // // // // // // //           break;

// // // // // // // //         case 'START_LOCATION_TRACKING':
// // // // // // // //           response = await handleStartLocationTracking(payload);
// // // // // // // //           break;

// // // // // // // //         case 'STOP_LOCATION_TRACKING':
// // // // // // // //           response = await handleStopLocationTracking();
// // // // // // // //           break;

// // // // // // // //         case 'SHOW_NOTIFICATION':
// // // // // // // //           response = await handleShowNotification(payload);
// // // // // // // //           break;

// // // // // // // //         case 'PLAY_AUDIO':
// // // // // // // //           response = await handlePlayAudio(payload);
// // // // // // // //           break;

// // // // // // // //         case 'GO_ONLINE':
// // // // // // // //           response = await handleGoOnline(payload);
// // // // // // // //           break;

// // // // // // // //         case 'GO_OFFLINE':
// // // // // // // //           response = await handleGoOffline(payload);
// // // // // // // //           break;

// // // // // // // //         default:
// // // // // // // //           logger.warn(`Unknown message type: ${type}`);
// // // // // // // //           response = { error: 'Unknown message type' };
// // // // // // // //       }

// // // // // // // //       // Send response back to WebView if requestId provided
// // // // // // // //       if (requestId) {
// // // // // // // //         sendToWebView({
// // // // // // // //           type: `${type}_RESPONSE`,
// // // // // // // //           requestId,
// // // // // // // //           payload: response,
// // // // // // // //         });
// // // // // // // //       }
// // // // // // // //     } catch (error: any) {
// // // // // // // //       logger.error('Error handling WebView message:', error);

// // // // // // // //       // Send error response
// // // // // // // //       try {
// // // // // // // //         const { requestId } = JSON.parse(event.nativeEvent.data);
// // // // // // // //         if (requestId) {
// // // // // // // //           sendToWebView({
// // // // // // // //             type: 'ERROR',
// // // // // // // //             requestId,
// // // // // // // //             payload: { error: error.message },
// // // // // // // //           });
// // // // // // // //         }
// // // // // // // //       } catch {}
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Initialize Services (called after user authentication)
// // // // // // // //   const handleInitializeServices = async (payload: any) => {
// // // // // // // //     try {
// // // // // // // //       const { userId, frontendName, socketServerUrl } = payload;

// // // // // // // //       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

// // // // // // // //       if (servicesInitialized) {
// // // // // // // //         logger.warn('Services already initialized');
// // // // // // // //         return { success: true, reason: 'already_initialized' };
// // // // // // // //       }

// // // // // // // //       // Generate device ID
// // // // // // // //       const deviceInfo = await getDeviceInfo();
// // // // // // // //       const deviceId = deviceInfo.deviceId;

// // // // // // // //       deviceIdRef.current = deviceId;
// // // // // // // //       userIdRef.current = userId;
// // // // // // // //       frontendNameRef.current = frontendName;

// // // // // // // //       // 1. Request critical permissions first
// // // // // // // //       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

// // // // // // // //       if (!permissionsGranted.location) {
// // // // // // // //         logger.error('Location permission denied - cannot initialize');
// // // // // // // //         return {
// // // // // // // //           success: false,
// // // // // // // //           error: 'Location permission required',
// // // // // // // //           permissions: permissionsGranted,
// // // // // // // //         };
// // // // // // // //       }

// // // // // // // //       // 2. Start background services
// // // // // // // //       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
// // // // // // // //       const servicesStarted = await BackgroundService.start({
// // // // // // // //         deviceId,
// // // // // // // //         userId,
// // // // // // // //         frontendName,
// // // // // // // //         socketServerUrl: socketUrl,
// // // // // // // //       });

// // // // // // // //       if (!servicesStarted) {
// // // // // // // //         logger.error('Failed to start background services');
// // // // // // // //         return {
// // // // // // // //           success: false,
// // // // // // // //           error: 'Failed to start services',
// // // // // // // //         };
// // // // // // // //       }

// // // // // // // //       // 3. Setup socket event listeners
// // // // // // // //       setupSocketListeners(deviceId, frontendName);

// // // // // // // //       setServicesInitialized(true);
// // // // // // // //       logger.info('✅ Services initialized successfully');

// // // // // // // //       return {
// // // // // // // //         success: true,
// // // // // // // //         deviceId,
// // // // // // // //         permissions: permissionsGranted,
// // // // // // // //         socketConnected: DeviceSocketService.isConnected(),
// // // // // // // //       };
// // // // // // // //     } catch (error: any) {
// // // // // // // //       logger.error('Error initializing services:', error);
// // // // // // // //       return { success: false, error: error.message };
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Request Permission
// // // // // // // //   const handleRequestPermission = async (payload: any) => {
// // // // // // // //     const { permissionType } = payload;
// // // // // // // //     logger.info(`Requesting permission: ${permissionType}`);

// // // // // // // //     try {
// // // // // // // //       const status = await PermissionManager.request(permissionType);
// // // // // // // //       return { status };
// // // // // // // //     } catch (error: any) {
// // // // // // // //       logger.error(`Error requesting ${permissionType}:`, error);
// // // // // // // //       return { status: 'denied', error: error.message };
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Check Permission
// // // // // // // //   const handleCheckPermission = async (payload: any) => {
// // // // // // // //     const { permissionType } = payload;
// // // // // // // //     const status = await PermissionManager.check(permissionType);
// // // // // // // //     return { status };
// // // // // // // //   };

// // // // // // // //   // Get Current Location
// // // // // // // //   const handleGetCurrentLocation = async () => {
// // // // // // // //     try {
// // // // // // // //       const location = await LocationService.getCurrentLocation();
// // // // // // // //       if (location) {
// // // // // // // //         return {
// // // // // // // //           location: {
// // // // // // // //             lat: location.coords.latitude,
// // // // // // // //             lng: location.coords.longitude,
// // // // // // // //             accuracy: location.coords.accuracy,
// // // // // // // //             heading: location.coords.heading,
// // // // // // // //             speed: location.coords.speed,
// // // // // // // //           },
// // // // // // // //         };
// // // // // // // //       }
// // // // // // // //       return { error: 'Could not get location' };
// // // // // // // //     } catch (error: any) {
// // // // // // // //       logger.error('Error getting location:', error);
// // // // // // // //       return { error: error.message };
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Start Location Tracking
// // // // // // // //   const handleStartLocationTracking = async (payload: any) => {
// // // // // // // //     try {
// // // // // // // //       if (!deviceIdRef.current) {
// // // // // // // //         throw new Error('Device not initialized');
// // // // // // // //       }

// // // // // // // //       await LocationService.startPersistentTracking(deviceIdRef.current);
// // // // // // // //       return { success: true };
// // // // // // // //     } catch (error: any) {
// // // // // // // //       logger.error('Error starting location tracking:', error);
// // // // // // // //       return { success: false, error: error.message };
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Stop Location Tracking
// // // // // // // //   const handleStopLocationTracking = async () => {
// // // // // // // //     try {
// // // // // // // //       await LocationService.stopPersistentTracking();
// // // // // // // //       return { success: true };
// // // // // // // //     } catch (error: any) {
// // // // // // // //       logger.error('Error stopping location tracking:', error);
// // // // // // // //       return { success: false, error: error.message };
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Show Notification
// // // // // // // //   const handleShowNotification = async (payload: any) => {
// // // // // // // //     try {
// // // // // // // //       await NotificationService.show(payload);
// // // // // // // //       return { success: true };
// // // // // // // //     } catch (error: any) {
// // // // // // // //       return { success: false, error: error.message };
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Play Audio
// // // // // // // //   const handlePlayAudio = async (payload: any) => {
// // // // // // // //     const { soundFile } = payload;
// // // // // // // //     try {
// // // // // // // //       await AudioService.playAlert(soundFile);
// // // // // // // //       return { success: true };
// // // // // // // //     } catch (error: any) {
// // // // // // // //       return { success: false, error: error.message };
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Go Online (Driver)
// // // // // // // //   const handleGoOnline = async (payload: any) => {
// // // // // // // //     try {
// // // // // // // //       const location = await LocationService.getCurrentLocation();

// // // // // // // //       if (!location) {
// // // // // // // //         throw new Error('Cannot get current location');
// // // // // // // //       }

// // // // // // // //       await DeviceSocketService.emit('driver:online', {
// // // // // // // //         driverId: userIdRef.current,
// // // // // // // //         location: {
// // // // // // // //           lat: location.coords.latitude,
// // // // // // // //           lng: location.coords.longitude,
// // // // // // // //         },
// // // // // // // //       });

// // // // // // // //       return {
// // // // // // // //         success: true,
// // // // // // // //         location: {
// // // // // // // //           lat: location.coords.latitude,
// // // // // // // //           lng: location.coords.longitude,
// // // // // // // //         },
// // // // // // // //       };
// // // // // // // //     } catch (error: any) {
// // // // // // // //       return { success: false, error: error.message };
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Go Offline (Driver)
// // // // // // // //   const handleGoOffline = async (payload: any) => {
// // // // // // // //     try {
// // // // // // // //       await DeviceSocketService.emit('driver:offline', {
// // // // // // // //         driverId: userIdRef.current,
// // // // // // // //       });

// // // // // // // //       return { success: true };
// // // // // // // //     } catch (error: any) {
// // // // // // // //       return { success: false, error: error.message };
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // WebView error handler
// // // // // // // //   const handleWebViewError = (syntheticEvent: any) => {
// // // // // // // //     const { nativeEvent } = syntheticEvent;
// // // // // // // //     logger.error('WebView error:', nativeEvent);
// // // // // // // //     setHasError(true);
// // // // // // // //   };

// // // // // // // //   // WebView load end handler
// // // // // // // //   const handleLoadEnd = () => {
// // // // // // // //     logger.info('loading ended')
// // // // // // // //     setIsLoading(false);
// // // // // // // //   };

// // // // // // // //   // Render loading state
// // // // // // // //   // if (isLoading) {
// // // // // // // //   //   return (
// // // // // // // //   //     <OkraSkeletonLoader/>
// // // // // // // //   //   );
// // // // // // // //   // }

// // // // // // // //   // Render error state
// // // // // // // //   if (hasError) {
// // // // // // // //     return (
// // // // // // // //       <View style={styles.errorContainer}>
// // // // // // // //         <Text style={styles.errorTitle}>😔 Oops!</Text>
// // // // // // // //         <Text style={styles.errorText}>
// // // // // // // //           Something went wrong loading the app.
// // // // // // // //         </Text>
// // // // // // // //         <Text style={styles.errorSubtext}>
// // // // // // // //           Please check your internet connection and try again.
// // // // // // // //         </Text>
// // // // // // // //       </View>
// // // // // // // //     );
// // // // // // // //   }

// // // // // // // //   // Render offline state
// // // // // // // //   if (!isConnected) {
// // // // // // // //     return (
// // // // // // // //       <View style={styles.offlineContainer}>
// // // // // // // //         <Text style={styles.offlineTitle}>📡 No Connection</Text>
// // // // // // // //         <Text style={styles.offlineText}>
// // // // // // // //           You're currently offline. Please check your internet connection.
// // // // // // // //         </Text>
// // // // // // // //       </View>
// // // // // // // //     );
// // // // // // // //   }

// // // // // // // //   return (
// // // // // // // //     <SafeAreaView style={styles.container}>
// // // // // // // //       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
// // // // // // // //       <WebView
// // // // // // // //         ref={webViewRef}
// // // // // // // //         source={{ uri: FRONTEND_URL }}
// // // // // // // //         onMessage={onMessage}
// // // // // // // //         javaScriptEnabled={true}
// // // // // // // //         domStorageEnabled={true}
// // // // // // // //         geolocationEnabled={true}
// // // // // // // //         startInLoadingState={true}
// // // // // // // //         originWhitelist={['*']} // Allows navigation to all frontends
// // // // // // // //         allowsInlineMediaPlayback={true}
// // // // // // // //         mediaPlaybackRequiresUserAction={false}
// // // // // // // //         style={styles.webview}
// // // // // // // //         onError={handleWebViewError}
// // // // // // // //         onLoadEnd={handleLoadEnd}
// // // // // // // //         onHttpError={(syntheticEvent) => {
// // // // // // // //           const { nativeEvent } = syntheticEvent;
// // // // // // // //           logger.error('WebView HTTP error:', nativeEvent.statusCode);
// // // // // // // //         }}
// // // // // // // //         // Performance optimizations
// // // // // // // //         cacheEnabled={true}
// // // // // // // //         cacheMode="LOAD_DEFAULT"
// // // // // // // //         mixedContentMode="always"
// // // // // // // //         // Security
// // // // // // // //         allowFileAccess={false}
// // // // // // // //         allowUniversalAccessFromFileURLs={false}
// // // // // // // //       />
// // // // // // // //     </SafeAreaView>
// // // // // // // //   );
// // // // // // // // }

// // // // // // // // const styles = StyleSheet.create({
// // // // // // // //   container: {
// // // // // // // //     flex: 1,
// // // // // // // //     backgroundColor: '#FFFFFF',
// // // // // // // //   },
// // // // // // // //   webview: {
// // // // // // // //     flex: 1,
// // // // // // // //   },
// // // // // // // //   loadingContainer: {
// // // // // // // //     flex: 1,
// // // // // // // //     justifyContent: 'center',
// // // // // // // //     alignItems: 'center',
// // // // // // // //     backgroundColor: '#FFFFFF',
// // // // // // // //   },
// // // // // // // //   loadingText: {
// // // // // // // //     marginTop: 16,
// // // // // // // //     fontSize: 16,
// // // // // // // //     color: '#666666',
// // // // // // // //   },
// // // // // // // //   errorContainer: {
// // // // // // // //     flex: 1,
// // // // // // // //     justifyContent: 'center',
// // // // // // // //     alignItems: 'center',
// // // // // // // //     backgroundColor: '#FFFFFF',
// // // // // // // //     padding: 24,
// // // // // // // //   },
// // // // // // // //   errorTitle: {
// // // // // // // //     fontSize: 48,
// // // // // // // //     marginBottom: 16,
// // // // // // // //   },
// // // // // // // //   errorText: {
// // // // // // // //     fontSize: 18,
// // // // // // // //     fontWeight: '600',
// // // // // // // //     color: '#1A1A1A',
// // // // // // // //     textAlign: 'center',
// // // // // // // //     marginBottom: 8,
// // // // // // // //   },
// // // // // // // //   errorSubtext: {
// // // // // // // //     fontSize: 14,
// // // // // // // //     color: '#666666',
// // // // // // // //     textAlign: 'center',
// // // // // // // //   },
// // // // // // // //   offlineContainer: {
// // // // // // // //     flex: 1,
// // // // // // // //     justifyContent: 'center',
// // // // // // // //     alignItems: 'center',
// // // // // // // //     backgroundColor: '#FFFFFF',
// // // // // // // //     padding: 24,
// // // // // // // //   },
// // // // // // // //   offlineTitle: {
// // // // // // // //     fontSize: 48,
// // // // // // // //     marginBottom: 16,
// // // // // // // //   },
// // // // // // // //   offlineText: {
// // // // // // // //     fontSize: 16,
// // // // // // // //     color: '#666666',
// // // // // // // //     textAlign: 'center',
// // // // // // // //   },
// // // // // // // // });
// // // // // // // import React, { useRef, useEffect, useState, useCallback } from 'react';
// // // // // // // import {
// // // // // // //   SafeAreaView,
// // // // // // //   StatusBar,
// // // // // // //   Platform,
// // // // // // //   AppState,
// // // // // // //   StyleSheet,
// // // // // // //   View,
// // // // // // //   Text,
// // // // // // //   ActivityIndicator,
// // // // // // // } from 'react-native';
// // // // // // // import { WebView } from 'react-native-webview';
// // // // // // // import * as Notifications from 'expo-notifications';
// // // // // // // import * as TaskManager from 'expo-task-manager';
// // // // // // // import NetInfo from '@react-native-community/netinfo';

// // // // // // // import BackgroundService from './src/services/BackgroundService';
// // // // // // // import DeviceSocketService from './src/services/DeviceSocketService';
// // // // // // // import LocationService from './src/services/LocationService';
// // // // // // // import NotificationService from './src/services/NotificationService';
// // // // // // // import PermissionManager from './src/services/PermissionManager';
// // // // // // // import AudioService from './src/services/AudioService';
// // // // // // // import DeepLinkService from './src/services/DeepLinkService';
// // // // // // // import { getDeviceInfo } from './src/utils/device-info';
// // // // // // // import { logger } from './src/utils/logger';
// // // // // // // import { NavigationHelper } from './src/utils/navigation';
// // // // // // // import { CONSTANTS } from './src/utils/constants';
// // // // // // // import type { WebViewMessage } from './src/types/messages';
// // // // // // // import OkraSkeletonLoader from '@components/OkraSkeletonLoader';

// // // // // // // // Define background notification task
// // // // // // // TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
// // // // // // //   if (error) {
// // // // // // //     logger.error('Background notification task error:', error);
// // // // // // //     return;
// // // // // // //   }

// // // // // // //   if (data) {
// // // // // // //     await NotificationService.handleBackgroundNotification(data);
// // // // // // //   }
// // // // // // // });

// // // // // // // const FRONTEND_URL = __DEV__
// // // // // // //   ? Platform.OS === 'android'
// // // // // // //     ? 'http://10.64.246.23:3000' // Android emulator
// // // // // // //     : 'http://10.64.246.23:3000' // iOS simulator
// // // // // // //   : CONSTANTS.FRONTEND_URLS.landing;

// // // // // // // export default function App() {
// // // // // // //   const webViewRef = useRef<WebView>(null);
// // // // // // //   const [appState, setAppState] = useState(AppState.currentState);
// // // // // // //   const [servicesInitialized, setServicesInitialized] = useState(false);
// // // // // // //   const [isLoading, setIsLoading] = useState(true);
// // // // // // //   const [hasError, setHasError] = useState(false);
// // // // // // //   const [isConnected, setIsConnected] = useState(true);
  
// // // // // // //   const deviceIdRef = useRef<string | null>(null);
// // // // // // //   const userIdRef = useRef<string | number | null>(null);
// // // // // // //   const frontendNameRef = useRef<string | null>(null);

// // // // // // //   // ============================================
// // // // // // //   // Enhanced Send Message Function
// // // // // // //   // ============================================
// // // // // // //   const sendToWebView = useCallback((data: any) => {
// // // // // // //     if (!webViewRef.current) {
// // // // // // //       logger.warn('Cannot send to WebView: ref is null');
// // // // // // //       return;
// // // // // // //     }

// // // // // // //     try {
// // // // // // //       // Ensure data is properly formatted
// // // // // // //       const message = {
// // // // // // //         type: data.type,
// // // // // // //         requestId: data.requestId,
// // // // // // //         payload: data.payload || {},
// // // // // // //         error: data.error || null,
// // // // // // //         timestamp: Date.now()
// // // // // // //       };

// // // // // // //       const messageString = JSON.stringify(message);
// // // // // // //       logger.debug('Sending to WebView:', { type: message.type, requestId: message.requestId });
      
// // // // // // //       webViewRef.current.postMessage(messageString);
// // // // // // //     } catch (error) {
// // // // // // //       logger.error('Error sending to WebView:', error);
// // // // // // //     }
// // // // // // //   }, []);

// // // // // // //   // Initialize notification service on mount
// // // // // // //   useEffect(() => {
// // // // // // //     const initNotifications = async () => {
// // // // // // //       await NotificationService.initialize(sendToWebView);
// // // // // // //     };

// // // // // // //     initNotifications();

// // // // // // //     return () => {
// // // // // // //       NotificationService.cleanup();
// // // // // // //     };
// // // // // // //   }, [sendToWebView]);

// // // // // // //   // Monitor network connectivity
// // // // // // //   useEffect(() => {
// // // // // // //     const unsubscribe = NetInfo.addEventListener(state => {
// // // // // // //       setIsConnected(state.isConnected ?? false);
      
// // // // // // //       if (state.isConnected && servicesInitialized) {
// // // // // // //         // Reconnect socket if disconnected
// // // // // // //         if (!DeviceSocketService.isConnected()) {
// // // // // // //           logger.info('Network restored, reconnecting socket...');
// // // // // // //           DeviceSocketService.reconnect();
// // // // // // //         }
// // // // // // //       }
// // // // // // //     });

// // // // // // //     return () => unsubscribe();
// // // // // // //   }, [servicesInitialized]);

// // // // // // //   // Handle App State Changes
// // // // // // //   useEffect(() => {
// // // // // // //     const subscription = AppState.addEventListener('change', async (nextAppState) => {
// // // // // // //       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

// // // // // // //       if (appState.match(/inactive|background/) && nextAppState === 'active') {
// // // // // // //         // App came to foreground
// // // // // // //         logger.info('App resumed to foreground');

// // // // // // //         // Check socket connection health
// // // // // // //         if (servicesInitialized && !DeviceSocketService.isConnected()) {
// // // // // // //           logger.warn('Socket disconnected, attempting reconnect');
// // // // // // //           await DeviceSocketService.reconnect();
// // // // // // //         }

// // // // // // //         // Notify WebView
// // // // // // //         sendToWebView({ type: 'APP_RESUMED', payload: {} });
// // // // // // //       } else if (nextAppState === 'background') {
// // // // // // //         logger.info('App moved to background');
        
// // // // // // //         // Ensure background service is running (Android)
// // // // // // //         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
// // // // // // //           await BackgroundService.ensureForegroundService();
// // // // // // //         }
// // // // // // //       }

// // // // // // //       setAppState(nextAppState);
// // // // // // //     });

// // // // // // //     return () => subscription.remove();
// // // // // // //   }, [appState, servicesInitialized, sendToWebView]);

// // // // // // //   // Setup Socket Listeners (called after initialization)
// // // // // // //   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
// // // // // // //     logger.info(`Setting up socket listeners for ${frontendName}`);

// // // // // // //     // Listen for location requests from backend
// // // // // // //     DeviceSocketService.on('getCurrentLocation', async () => {
// // // // // // //       logger.info('Received location request from backend');
// // // // // // //       try {
// // // // // // //         const location = await LocationService.getCurrentLocation();
// // // // // // //         if (location) {
// // // // // // //           await DeviceSocketService.emit('device:location:update', {
// // // // // // //             deviceId,
// // // // // // //             location: {
// // // // // // //               lat: location.coords.latitude,
// // // // // // //               lng: location.coords.longitude,
// // // // // // //               accuracy: location.coords.accuracy,
// // // // // // //               altitude: location.coords.altitude,
// // // // // // //               altitudeAccuracy: location.coords.altitudeAccuracy,
// // // // // // //               heading: location.coords.heading,
// // // // // // //               speed: location.coords.speed,
// // // // // // //             },
// // // // // // //             timestamp: location.timestamp,
// // // // // // //           });

// // // // // // //           // Also notify WebView
// // // // // // //           sendToWebView({
// // // // // // //             type: 'LOCATION_UPDATE',
// // // // // // //             payload: {
// // // // // // //               lat: location.coords.latitude,
// // // // // // //               lng: location.coords.longitude,
// // // // // // //               accuracy: location.coords.accuracy,
// // // // // // //               heading: location.coords.heading,
// // // // // // //               speed: location.coords.speed,
// // // // // // //             },
// // // // // // //           });
// // // // // // //         }
// // // // // // //       } catch (error) {
// // // // // // //         logger.error('Error getting location on request:', error);
// // // // // // //       }
// // // // // // //     });

// // // // // // //     // Listen for notifications
// // // // // // //     DeviceSocketService.on('showNotification', async (notification: any) => {
// // // // // // //       logger.info('Received notification request:', notification.type);
// // // // // // //       await NotificationService.show(notification);

// // // // // // //       // Notify WebView
// // // // // // //       sendToWebView({
// // // // // // //         type: 'NOTIFICATION_RECEIVED',
// // // // // // //         payload: notification,
// // // // // // //       });
// // // // // // //     });

// // // // // // //     // Listen for draw-over requests (Android only, non-rider)
// // // // // // //     if (Platform.OS === 'android' && frontendName !== 'rider') {
// // // // // // //       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
// // // // // // //         logger.info('Received draw-over request');

// // // // // // //         // Check if shouldDrawOver flag is set
// // // // // // //         if (overlayData.shouldDrawOver === false) {
// // // // // // //           logger.info('shouldDrawOver is false, skipping overlay');
          
// // // // // // //           // Still show notification and notify WebView
// // // // // // //           await NotificationService.showHighPriority({
// // // // // // //             title: 'New Ride Request',
// // // // // // //             body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // // // // //             data: overlayData,
// // // // // // //           });
          
// // // // // // //           sendToWebView({
// // // // // // //             type: 'RIDE_REQUEST',
// // // // // // //             payload: overlayData,
// // // // // // //           });
          
// // // // // // //           return;
// // // // // // //         }

// // // // // // //         // Play audio alert
// // // // // // //         await AudioService.playAlert("ride_request");

// // // // // // //         // Show overlay if permission granted
// // // // // // //         const hasPermission = await PermissionManager.checkDrawOverPermission();
// // // // // // //         if (hasPermission) {
// // // // // // //           await BackgroundService.showDrawOver(overlayData);
// // // // // // //         }

// // // // // // //         // Show high-priority notification
// // // // // // //         await NotificationService.showHighPriority({
// // // // // // //           title: 'New Ride Request',
// // // // // // //           body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // // // // //           data: overlayData,
// // // // // // //         });

// // // // // // //         // Always notify WebView (even if overlay not shown)
// // // // // // //         sendToWebView({
// // // // // // //           type: 'RIDE_REQUEST',
// // // // // // //           payload: overlayData,
// // // // // // //         });
// // // // // // //       });
// // // // // // //     }

// // // // // // //     // Listen for socket connection status
// // // // // // //     DeviceSocketService.on('connected', () => {
// // // // // // //       logger.info('Device socket connected');
// // // // // // //       sendToWebView({ type: 'SOCKET_CONNECTED', payload: {} });
// // // // // // //     });

// // // // // // //     DeviceSocketService.on('disconnected', (reason: string) => {
// // // // // // //       logger.warn('Device socket disconnected:', reason);
// // // // // // //       sendToWebView({
// // // // // // //         type: 'SOCKET_DISCONNECTED',
// // // // // // //         payload: { reason },
// // // // // // //       });
// // // // // // //     });
// // // // // // //   }, [sendToWebView]);

// // // // // // //   // ============================================
// // // // // // //   // Enhanced Message Handler with Proper Response Formatting
// // // // // // //   // ============================================
// // // // // // //   const onMessage = async (event: any) => {
// // // // // // //     let requestId: string | null | any = null;
// // // // // // //     let originalType: string | null = null;

// // // // // // //     try {
// // // // // // //       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
// // // // // // //       const { type, requestId: reqId, payload } = message;
      
// // // // // // //       requestId = reqId;
// // // // // // //       originalType = type;

// // // // // // //       logger.info(`Received message from WebView: ${type}`, { requestId });

// // // // // // //       let response: any = null;

// // // // // // //       switch (type) {
// // // // // // //         case 'INITIALIZE_SERVICES':
// // // // // // //           response = await handleInitializeServices(payload);
// // // // // // //           break;

// // // // // // //         case 'REQUEST_PERMISSION':
// // // // // // //           response = await handleRequestPermission(payload);
// // // // // // //           break;

// // // // // // //         case 'CHECK_PERMISSION':
// // // // // // //           response = await handleCheckPermission(payload);
// // // // // // //           break;

// // // // // // //         case 'GET_CURRENT_LOCATION':
// // // // // // //           response = await handleGetCurrentLocation(payload);
// // // // // // //           break;

// // // // // // //         case 'START_LOCATION_TRACKING':
// // // // // // //           response = await handleStartLocationTracking(payload);
// // // // // // //           break;

// // // // // // //         case 'STOP_LOCATION_TRACKING':
// // // // // // //           response = await handleStopLocationTracking();
// // // // // // //           break;

// // // // // // //         case 'SHOW_NOTIFICATION':
// // // // // // //           response = await handleShowNotification(payload);
// // // // // // //           break;

// // // // // // //         case 'PLAY_AUDIO':
// // // // // // //           response = await handlePlayAudio(payload);
// // // // // // //           break;

// // // // // // //         case 'GO_ONLINE':
// // // // // // //           response = await handleGoOnline(payload);
// // // // // // //           break;

// // // // // // //         case 'GO_OFFLINE':
// // // // // // //           response = await handleGoOffline(payload);
// // // // // // //           break;

// // // // // // //         case 'PING':
// // // // // // //           response = { status: 'ok', message: 'PONG' };
// // // // // // //           break;

// // // // // // //         default:
// // // // // // //           logger.warn(`Unknown message type: ${type}`);
// // // // // // //           response = { error: 'Unknown message type' };
// // // // // // //       }

// // // // // // //       // Always send response back with original type and requestId
// // // // // // //       if (requestId) {
// // // // // // //         logger.info('Sending response:', { type, requestId, hasError: !!response?.error });
// // // // // // //         sendToWebView({
// // // // // // //           type: type, // Send back the ORIGINAL type, not type_RESPONSE
// // // // // // //           requestId: requestId,
// // // // // // //           payload: response,
// // // // // // //           error: response?.error || null
// // // // // // //         });
// // // // // // //       }
// // // // // // //     } catch (error: any) {
// // // // // // //       logger.error('Error handling WebView message:', error);

// // // // // // //       // Send error response with original type and requestId
// // // // // // //       if (requestId && originalType) {
// // // // // // //         sendToWebView({
// // // // // // //           type: originalType, // Use original type for error response too
// // // // // // //           requestId,
// // // // // // //           error: error.message,
// // // // // // //           payload: null,
// // // // // // //         });
// // // // // // //       } else if (requestId) {
// // // // // // //         // Fallback if we lost originalType
// // // // // // //         sendToWebView({
// // // // // // //           type: 'ERROR',
// // // // // // //           requestId,
// // // // // // //           error: error.message,
// // // // // // //           payload: null,
// // // // // // //         });
// // // // // // //       }
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // ============================================
// // // // // // //   // Enhanced Get Current Location Handler
// // // // // // //   // ============================================
// // // // // // //   const handleGetCurrentLocation = async (payload: any) => {
// // // // // // //     try {
// // // // // // //       const { highAccuracy = true, maxAge = 0, timeout = 15000 } = payload || {};
      
// // // // // // //       logger.info('Getting current location', { highAccuracy, timeout });

// // // // // // //       const location = await LocationService.getCurrentLocation();
      
// // // // // // //       if (!location) {
// // // // // // //         throw new Error('Could not get location');
// // // // // // //       }

// // // // // // //       // Return in the exact format expected by web wrapper
// // // // // // //       const result = {
// // // // // // //         location: {
// // // // // // //           lat: location.coords.latitude,
// // // // // // //           lng: location.coords.longitude,
// // // // // // //           accuracy: location.coords.accuracy,
// // // // // // //           heading: location.coords.heading || null,
// // // // // // //           speed: location.coords.speed || null,
// // // // // // //         },
// // // // // // //         timestamp: location.timestamp,
// // // // // // //         success: true
// // // // // // //       };

// // // // // // //       logger.info('Location retrieved successfully:', result.location);
// // // // // // //       return result;
// // // // // // //     } catch (error: any) {
// // // // // // //       logger.error('Error getting location:', error);
// // // // // // //       return { 
// // // // // // //         error: error.message,
// // // // // // //         success: false 
// // // // // // //       };
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // ============================================
// // // // // // //   // Initialize Services with Better Error Handling
// // // // // // //   // ============================================
// // // // // // //   const handleInitializeServices = async (payload: any) => {
// // // // // // //     try {
// // // // // // //       const { userId, frontendName, socketServerUrl } = payload;

// // // // // // //       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

// // // // // // //       if (servicesInitialized) {
// // // // // // //         logger.warn('Services already initialized');
// // // // // // //         return { 
// // // // // // //           success: true, 
// // // // // // //           reason: 'already_initialized',
// // // // // // //           deviceId: deviceIdRef.current 
// // // // // // //         };
// // // // // // //       }

// // // // // // //       // Generate device ID
// // // // // // //       const deviceInfo = await getDeviceInfo();
// // // // // // //       const deviceId = deviceInfo.deviceId;

// // // // // // //       deviceIdRef.current = deviceId;
// // // // // // //       userIdRef.current = userId;
// // // // // // //       frontendNameRef.current = frontendName;

// // // // // // //       // 1. Request critical permissions first
// // // // // // //       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

// // // // // // //       if (!permissionsGranted.location) {
// // // // // // //         logger.error('Location permission denied - cannot initialize');
// // // // // // //         return {
// // // // // // //           success: false,
// // // // // // //           error: 'Location permission required',
// // // // // // //           permissions: permissionsGranted,
// // // // // // //         };
// // // // // // //       }

// // // // // // //       // 2. Start background services
// // // // // // //       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
// // // // // // //       const servicesStarted = await BackgroundService.start({
// // // // // // //         deviceId,
// // // // // // //         userId,
// // // // // // //         frontendName,
// // // // // // //         socketServerUrl: socketUrl,
// // // // // // //       });

// // // // // // //       if (!servicesStarted) {
// // // // // // //         logger.error('Failed to start background services');
// // // // // // //         return {
// // // // // // //           success: false,
// // // // // // //           error: 'Failed to start services',
// // // // // // //         };
// // // // // // //       }

// // // // // // //       // 3. Setup socket event listeners
// // // // // // //       setupSocketListeners(deviceId, frontendName);

// // // // // // //       setServicesInitialized(true);
// // // // // // //       logger.info('✅ Services initialized successfully');

// // // // // // //       return {
// // // // // // //         success: true,
// // // // // // //         deviceId,
// // // // // // //         permissions: permissionsGranted,
// // // // // // //         socketConnected: DeviceSocketService.isConnected(),
// // // // // // //       };
// // // // // // //     } catch (error: any) {
// // // // // // //       logger.error('Error initializing services:', error);
// // // // // // //       return { success: false, error: error.message };
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Request Permission
// // // // // // //   const handleRequestPermission = async (payload: any) => {
// // // // // // //     const { permissionType } = payload;
// // // // // // //     logger.info(`Requesting permission: ${permissionType}`);

// // // // // // //     try {
// // // // // // //       const status = await PermissionManager.request(permissionType);
// // // // // // //       return { status };
// // // // // // //     } catch (error: any) {
// // // // // // //       logger.error(`Error requesting ${permissionType}:`, error);
// // // // // // //       return { status: 'denied', error: error.message };
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Check Permission
// // // // // // //   const handleCheckPermission = async (payload: any) => {
// // // // // // //     const { permissionType } = payload;
// // // // // // //     const status = await PermissionManager.check(permissionType);
// // // // // // //     return { status };
// // // // // // //   };

// // // // // // //   // Start Location Tracking
// // // // // // //   const handleStartLocationTracking = async (payload: any) => {
// // // // // // //     try {
// // // // // // //       if (!deviceIdRef.current) {
// // // // // // //         throw new Error('Device not initialized');
// // // // // // //       }

// // // // // // //       await LocationService.startPersistentTracking(deviceIdRef.current);
// // // // // // //       return { success: true };
// // // // // // //     } catch (error: any) {
// // // // // // //       logger.error('Error starting location tracking:', error);
// // // // // // //       return { success: false, error: error.message };
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Stop Location Tracking
// // // // // // //   const handleStopLocationTracking = async () => {
// // // // // // //     try {
// // // // // // //       await LocationService.stopPersistentTracking();
// // // // // // //       return { success: true };
// // // // // // //     } catch (error: any) {
// // // // // // //       logger.error('Error stopping location tracking:', error);
// // // // // // //       return { success: false, error: error.message };
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Show Notification
// // // // // // //   const handleShowNotification = async (payload: any) => {
// // // // // // //     try {
// // // // // // //       await NotificationService.show(payload);
// // // // // // //       return { success: true };
// // // // // // //     } catch (error: any) {
// // // // // // //       return { success: false, error: error.message };
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Play Audio
// // // // // // //   const handlePlayAudio = async (payload: any) => {
// // // // // // //     const { soundFile } = payload;
// // // // // // //     try {
// // // // // // //       await AudioService.playAlert(soundFile);
// // // // // // //       return { success: true };
// // // // // // //     } catch (error: any) {
// // // // // // //       return { success: false, error: error.message };
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Go Online (Driver)
// // // // // // //   const handleGoOnline = async (payload: any) => {
// // // // // // //     try {
// // // // // // //       const location = await LocationService.getCurrentLocation();

// // // // // // //       if (!location) {
// // // // // // //         throw new Error('Cannot get current location');
// // // // // // //       }

// // // // // // //       await DeviceSocketService.emit('driver:online', {
// // // // // // //         driverId: userIdRef.current,
// // // // // // //         location: {
// // // // // // //           lat: location.coords.latitude,
// // // // // // //           lng: location.coords.longitude,
// // // // // // //         },
// // // // // // //       });

// // // // // // //       return {
// // // // // // //         success: true,
// // // // // // //         location: {
// // // // // // //           lat: location.coords.latitude,
// // // // // // //           lng: location.coords.longitude,
// // // // // // //         },
// // // // // // //       };
// // // // // // //     } catch (error: any) {
// // // // // // //       return { success: false, error: error.message };
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Go Offline (Driver)
// // // // // // //   const handleGoOffline = async (payload: any) => {
// // // // // // //     try {
// // // // // // //       await DeviceSocketService.emit('driver:offline', {
// // // // // // //         driverId: userIdRef.current,
// // // // // // //       });

// // // // // // //       return { success: true };
// // // // // // //     } catch (error: any) {
// // // // // // //       return { success: false, error: error.message };
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // WebView error handler
// // // // // // //   const handleWebViewError = (syntheticEvent: any) => {
// // // // // // //     const { nativeEvent } = syntheticEvent;
// // // // // // //     logger.error('WebView error:', nativeEvent);
// // // // // // //     setHasError(true);
// // // // // // //   };

// // // // // // //   // WebView load end handler
// // // // // // //   const handleLoadEnd = () => {
// // // // // // //     logger.info('WebView loading ended');
// // // // // // //     setIsLoading(false);
// // // // // // //   };

// // // // // // //   // Render error state
// // // // // // //   if (hasError) {
// // // // // // //     return (
// // // // // // //       <View style={styles.errorContainer}>
// // // // // // //         <Text style={styles.errorTitle}>😔 Oops!</Text>
// // // // // // //         <Text style={styles.errorText}>
// // // // // // //           Something went wrong loading the app.
// // // // // // //         </Text>
// // // // // // //         <Text style={styles.errorSubtext}>
// // // // // // //           Please check your internet connection and try again.
// // // // // // //         </Text>
// // // // // // //       </View>
// // // // // // //     );
// // // // // // //   }

// // // // // // //   // Render offline state
// // // // // // //   if (!isConnected) {
// // // // // // //     return (
// // // // // // //       <View style={styles.offlineContainer}>
// // // // // // //         <Text style={styles.offlineTitle}>📡 No Connection</Text>
// // // // // // //         <Text style={styles.offlineText}>
// // // // // // //           You're currently offline. Please check your internet connection.
// // // // // // //         </Text>
// // // // // // //       </View>
// // // // // // //     );
// // // // // // //   }

// // // // // // //   return (
// // // // // // //     <SafeAreaView style={styles.container}>
// // // // // // //       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
// // // // // // //       <WebView
// // // // // // //         ref={webViewRef}
// // // // // // //         source={{ uri: FRONTEND_URL }}
// // // // // // //         onMessage={onMessage}
// // // // // // //         javaScriptEnabled={true}
// // // // // // //         domStorageEnabled={true}
// // // // // // //         geolocationEnabled={true}
// // // // // // //         startInLoadingState={true}
// // // // // // //         originWhitelist={['*']} // Allows navigation to all frontends
// // // // // // //         allowsInlineMediaPlayback={true}
// // // // // // //         mediaPlaybackRequiresUserAction={false}
// // // // // // //         style={styles.webview}
// // // // // // //         onError={handleWebViewError}
// // // // // // //         onLoadEnd={handleLoadEnd}
// // // // // // //         onHttpError={(syntheticEvent) => {
// // // // // // //           const { nativeEvent } = syntheticEvent;
// // // // // // //           logger.error('WebView HTTP error:', nativeEvent.statusCode);
// // // // // // //         }}
// // // // // // //         // Performance optimizations
// // // // // // //         cacheEnabled={true}
// // // // // // //         cacheMode="LOAD_DEFAULT"
// // // // // // //         mixedContentMode="always"
// // // // // // //         // Security
// // // // // // //         allowFileAccess={false}
// // // // // // //         allowUniversalAccessFromFileURLs={false}
// // // // // // //       />
// // // // // // //     </SafeAreaView>
// // // // // // //   );
// // // // // // // }

// // // // // // // const styles = StyleSheet.create({
// // // // // // //   container: {
// // // // // // //     flex: 1,
// // // // // // //     backgroundColor: '#FFFFFF',
// // // // // // //   },
// // // // // // //   webview: {
// // // // // // //     flex: 1,
// // // // // // //   },
// // // // // // //   errorContainer: {
// // // // // // //     flex: 1,
// // // // // // //     justifyContent: 'center',
// // // // // // //     alignItems: 'center',
// // // // // // //     backgroundColor: '#FFFFFF',
// // // // // // //     padding: 24,
// // // // // // //   },
// // // // // // //   errorTitle: {
// // // // // // //     fontSize: 48,
// // // // // // //     marginBottom: 16,
// // // // // // //   },
// // // // // // //   errorText: {
// // // // // // //     fontSize: 18,
// // // // // // //     fontWeight: '600',
// // // // // // //     color: '#1A1A1A',
// // // // // // //     textAlign: 'center',
// // // // // // //     marginBottom: 8,
// // // // // // //   },
// // // // // // //   errorSubtext: {
// // // // // // //     fontSize: 14,
// // // // // // //     color: '#666666',
// // // // // // //     textAlign: 'center',
// // // // // // //   },
// // // // // // //   offlineContainer: {
// // // // // // //     flex: 1,
// // // // // // //     justifyContent: 'center',
// // // // // // //     alignItems: 'center',
// // // // // // //     backgroundColor: '#FFFFFF',
// // // // // // //     padding: 24,
// // // // // // //   },
// // // // // // //   offlineTitle: {
// // // // // // //     fontSize: 48,
// // // // // // //     marginBottom: 16,
// // // // // // //   },
// // // // // // //   offlineText: {
// // // // // // //     fontSize: 16,
// // // // // // //     color: '#666666',
// // // // // // //     textAlign: 'center',
// // // // // // //   },
// // // // // // // });
// // // // // // //OkraApp\App.tsx
// // // // // // import React, { useRef, useEffect, useState, useCallback } from 'react';
// // // // // // import {
// // // // // //   SafeAreaView,
// // // // // //   StatusBar,
// // // // // //   Platform,
// // // // // //   AppState,
// // // // // //   StyleSheet,
// // // // // //   View,
// // // // // //   Text,
// // // // // //   ActivityIndicator,
// // // // // // } from 'react-native';
// // // // // // import { WebView } from 'react-native-webview';
// // // // // // import * as Notifications from 'expo-notifications';
// // // // // // import * as TaskManager from 'expo-task-manager';
// // // // // // import NetInfo from '@react-native-community/netinfo';

// // // // // // import BackgroundService from './src/services/BackgroundService';
// // // // // // import DeviceSocketService from './src/services/DeviceSocketService';
// // // // // // import LocationService from './src/services/LocationService';
// // // // // // import NotificationService from './src/services/NotificationService';
// // // // // // import PermissionManager from './src/services/PermissionManager';
// // // // // // import AudioService from './src/services/AudioService';
// // // // // // import DeepLinkService from './src/services/DeepLinkService';
// // // // // // import { getDeviceInfo } from './src/utils/device-info';
// // // // // // import { logger } from './src/utils/logger';
// // // // // // import { NavigationHelper } from './src/utils/navigation';
// // // // // // import { CONSTANTS } from './src/utils/constants';
// // // // // // import type { WebViewMessage } from './src/types/messages';
// // // // // // import OkraSkeletonLoader from '@components/OkraSkeletonLoader';

// // // // // // // Define background notification task
// // // // // // TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
// // // // // //   if (error) {
// // // // // //     logger.error('Background notification task error:', error);
// // // // // //     return;
// // // // // //   }

// // // // // //   if (data) {
// // // // // //     await NotificationService.handleBackgroundNotification(data);
// // // // // //   }
// // // // // // });

// // // // // // const FRONTEND_URL = __DEV__
// // // // // //   ? Platform.OS === 'android'
// // // // // //     ? 'http://10.64.246.23:3000' // Android emulator
// // // // // //     : 'http://10.64.246.23:3000' // iOS simulator
// // // // // //   : CONSTANTS.FRONTEND_URLS.landing;

// // // // // // export default function App() {
// // // // // //   const webViewRef = useRef<WebView>(null);
// // // // // //   const [appState, setAppState] = useState(AppState.currentState);
// // // // // //   const [servicesInitialized, setServicesInitialized] = useState(false);
// // // // // //   const [isLoading, setIsLoading] = useState(true);
// // // // // //   const [hasError, setHasError] = useState(false);
// // // // // //   const [isConnected, setIsConnected] = useState(true);
  
// // // // // //   const deviceIdRef = useRef<string | null>(null);
// // // // // //   const userIdRef = useRef<string | number | null>(null);
// // // // // //   const frontendNameRef = useRef<string | null>(null);

// // // // // //   // Send message to WebView
// // // // // //   const sendToWebView = useCallback((data: any) => {
// // // // // //     if (!webViewRef.current) {
// // // // // //       logger.warn('Cannot send to WebView: ref is null');
// // // // // //       return;
// // // // // //     }

// // // // // //     NavigationHelper.sendMessage(webViewRef, data.type, data.payload);
// // // // // //   }, []);

// // // // // //   // Initialize notification service on mount
// // // // // //   useEffect(() => {
// // // // // //     const initNotifications = async () => {
// // // // // //       await NotificationService.initialize(sendToWebView);
// // // // // //     };

// // // // // //     initNotifications();

// // // // // //     return () => {
// // // // // //       NotificationService.cleanup();
// // // // // //     };
// // // // // //   }, [sendToWebView]);

// // // // // //   // Monitor network connectivity
// // // // // //   useEffect(() => {
// // // // // //     const unsubscribe = NetInfo.addEventListener(state => {
// // // // // //       setIsConnected(state.isConnected ?? false);
      
// // // // // //       if (state.isConnected && servicesInitialized) {
// // // // // //         // Reconnect socket if disconnected
// // // // // //         if (!DeviceSocketService.isConnected()) {
// // // // // //           logger.info('Network restored, reconnecting socket...');
// // // // // //           DeviceSocketService.reconnect();
// // // // // //         }
// // // // // //       }
// // // // // //     });

// // // // // //     return () => unsubscribe();
// // // // // //   }, [servicesInitialized]);

// // // // // //   // Handle App State Changes
// // // // // //   useEffect(() => {
// // // // // //     const subscription = AppState.addEventListener('change', async (nextAppState) => {
// // // // // //       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

// // // // // //       if (appState.match(/inactive|background/) && nextAppState === 'active') {
// // // // // //         // App came to foreground
// // // // // //         logger.info('App resumed to foreground');

// // // // // //         // Check socket connection health
// // // // // //         if (servicesInitialized && !DeviceSocketService.isConnected()) {
// // // // // //           logger.warn('Socket disconnected, attempting reconnect');
// // // // // //           await DeviceSocketService.reconnect();
// // // // // //         }

// // // // // //         // Notify WebView
// // // // // //         sendToWebView({ type: 'APP_RESUMED', payload: {} });
// // // // // //       } else if (nextAppState === 'background') {
// // // // // //         logger.info('App moved to background');
        
// // // // // //         // Ensure background service is running (Android)
// // // // // //         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
// // // // // //           await BackgroundService.ensureForegroundService();
// // // // // //         }
// // // // // //       }

// // // // // //       setAppState(nextAppState);
// // // // // //     });

// // // // // //     return () => subscription.remove();
// // // // // //   }, [appState, servicesInitialized, sendToWebView]);

// // // // // //   // Setup Socket Listeners (called after initialization)
// // // // // //   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
// // // // // //     logger.info(`Setting up socket listeners for ${frontendName}`);

// // // // // //     // Listen for location requests from backend
// // // // // //     DeviceSocketService.on('getCurrentLocation', async () => {
// // // // // //       logger.info('Received location request from backend via socket');
// // // // // //       try {
// // // // // //         const location = await LocationService.getCurrentLocation();
// // // // // //         if (location) {
// // // // // //           await DeviceSocketService.emit('device:location:update', {
// // // // // //             deviceId,
// // // // // //             location: {
// // // // // //               lat: location.coords.latitude,
// // // // // //               lng: location.coords.longitude,
// // // // // //               accuracy: location.coords.accuracy,
// // // // // //               altitude: location.coords.altitude,
// // // // // //               altitudeAccuracy: location.coords.altitudeAccuracy,
// // // // // //               heading: location.coords.heading,
// // // // // //               speed: location.coords.speed,
// // // // // //             },
// // // // // //             timestamp: location.timestamp,
// // // // // //           });

// // // // // //           // Also notify WebView
// // // // // //           sendToWebView({
// // // // // //             type: 'LOCATION_UPDATE',
// // // // // //             payload: {
// // // // // //               lat: location.coords.latitude,
// // // // // //               lng: location.coords.longitude,
// // // // // //               accuracy: location.coords.accuracy,
// // // // // //               heading: location.coords.heading,
// // // // // //               speed: location.coords.speed,
// // // // // //             },
// // // // // //           });
// // // // // //         }
// // // // // //       } catch (error) {
// // // // // //         logger.error('Error getting location on request:', error);
// // // // // //       }
// // // // // //     });

// // // // // //     // Listen for notifications
// // // // // //     DeviceSocketService.on('showNotification', async (notification: any) => {
// // // // // //       logger.info('Received notification request:', notification.type);
// // // // // //       await NotificationService.show(notification);

// // // // // //       // Notify WebView
// // // // // //       sendToWebView({
// // // // // //         type: 'NOTIFICATION_RECEIVED',
// // // // // //         payload: notification,
// // // // // //       });
// // // // // //     });

// // // // // //     // Listen for draw-over requests (Android only, non-rider)
// // // // // //     if (Platform.OS === 'android' && frontendName !== 'rider') {
// // // // // //       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
// // // // // //         logger.info('Received draw-over request');

// // // // // //         // Check if shouldDrawOver flag is set
// // // // // //         if (overlayData.shouldDrawOver === false) {
// // // // // //           logger.info('shouldDrawOver is false, skipping overlay');
          
// // // // // //           // Still show notification and notify WebView
// // // // // //           await NotificationService.showHighPriority({
// // // // // //             title: 'New Ride Request',
// // // // // //             body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // // // //             data: overlayData,
// // // // // //           });
          
// // // // // //           sendToWebView({
// // // // // //             type: 'RIDE_REQUEST',
// // // // // //             payload: overlayData,
// // // // // //           });
          
// // // // // //           return;
// // // // // //         }

// // // // // //         // Play audio alert
// // // // // //         await AudioService.playAlert("ride_request");

// // // // // //         // Show overlay if permission granted
// // // // // //         const hasPermission = await PermissionManager.checkDrawOverPermission();
// // // // // //         if (hasPermission) {
// // // // // //           await BackgroundService.showDrawOver(overlayData);
// // // // // //         }

// // // // // //         // Show high-priority notification
// // // // // //         await NotificationService.showHighPriority({
// // // // // //           title: 'New Ride Request',
// // // // // //           body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // // // //           data: overlayData,
// // // // // //         });

// // // // // //         // Always notify WebView (even if overlay not shown)
// // // // // //         sendToWebView({
// // // // // //           type: 'RIDE_REQUEST',
// // // // // //           payload: overlayData,
// // // // // //         });
// // // // // //       });
// // // // // //     }

// // // // // //     // Listen for socket connection status
// // // // // //     DeviceSocketService.on('connected', () => {
// // // // // //       logger.info('Device socket connected');
// // // // // //       sendToWebView({ type: 'SOCKET_CONNECTED', payload: {} });
// // // // // //     });

// // // // // //     DeviceSocketService.on('disconnected', (reason: string) => {
// // // // // //       logger.warn('Device socket disconnected:', reason);
// // // // // //       sendToWebView({
// // // // // //         type: 'SOCKET_DISCONNECTED',
// // // // // //         payload: { reason },
// // // // // //       });
// // // // // //     });
// // // // // //   }, [sendToWebView]);

// // // // // //   // Handle messages from WebView
// // // // // //   const onMessage = async (event: any) => {
// // // // // //     try {
// // // // // //       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
// // // // // //       const { type, requestId, payload } = message;

// // // // // //       logger.info(`Received message from WebView: ${type}${requestId ? ` (requestId: ${requestId})` : ''}`);

// // // // // //       let response: any = null;

// // // // // //       switch (type) {
// // // // // //         case 'INITIALIZE_SERVICES':
// // // // // //           response = await handleInitializeServices(payload);
// // // // // //           break;
// // // // // //         case 'LOG_DATA':
// // // // // //           response = await handleLogDataFromWebView(payload);
// // // // // //           break;

// // // // // //         case 'REQUEST_PERMISSION':
// // // // // //           response = await handleRequestPermission(payload);
// // // // // //           break;

// // // // // //         case 'CHECK_PERMISSION':
// // // // // //           response = await handleCheckPermission(payload);
// // // // // //           break;

// // // // // //         case 'GET_CURRENT_LOCATION':
// // // // // //           response = await handleGetCurrentLocation();
// // // // // //           break;

// // // // // //         case 'START_LOCATION_TRACKING':
// // // // // //           response = await handleStartLocationTracking(payload);
// // // // // //           break;

// // // // // //         case 'STOP_LOCATION_TRACKING':
// // // // // //           response = await handleStopLocationTracking();
// // // // // //           break;

// // // // // //         case 'SHOW_NOTIFICATION':
// // // // // //           response = await handleShowNotification(payload);
// // // // // //           break;

// // // // // //         case 'PLAY_AUDIO':
// // // // // //           response = await handlePlayAudio(payload);
// // // // // //           break;

// // // // // //         case 'GO_ONLINE':
// // // // // //           response = await handleGoOnline(payload);
// // // // // //           break;

// // // // // //         case 'GO_OFFLINE':
// // // // // //           response = await handleGoOffline(payload);
// // // // // //           break;

// // // // // //         default:
// // // // // //           logger.warn(`Unknown message type: ${type}`);
// // // // // //           response = { error: 'Unknown message type' };
// // // // // //       }

// // // // // //       // Send response back to WebView if requestId provided
// // // // // //       if (requestId) {
// // // // // //         const messageToSend = {
// // // // // //           type: type,
// // // // // //           requestId,
// // // // // //           payload: response?.error ? null : response,
// // // // // //           error: response?.error || undefined
// // // // // //         };
        
// // // // // //         logger.info(`Sending response back to WebView for ${type}`, messageToSend);
        
// // // // // //         if (webViewRef.current) {
// // // // // //           webViewRef.current.postMessage(JSON.stringify(messageToSend));
// // // // // //         }
// // // // // //       }
// // // // // //     } catch (error: any) {
// // // // // //       logger.error('Error handling WebView message:', error);

// // // // // //       // Send error response
// // // // // //       try {
// // // // // //         const { requestId, type } = JSON.parse(event.nativeEvent.data);
// // // // // //         if (requestId && webViewRef.current) {
// // // // // //           webViewRef.current.postMessage(JSON.stringify({
// // // // // //             type: type,
// // // // // //             requestId,
// // // // // //             payload: null,
// // // // // //             error: error.message
// // // // // //           }));
// // // // // //         }
// // // // // //       } catch {}
// // // // // //     }
// // // // // //   };

// // // // // //   // Initialize Services (called after user authentication)
// // // // // //   const handleInitializeServices = async (payload: any) => {
// // // // // //     try {
// // // // // //       const { userId, frontendName, socketServerUrl } = payload;

// // // // // //       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

// // // // // //       if (servicesInitialized) {
// // // // // //         logger.warn('Services already initialized');
// // // // // //         return { success: true, reason: 'already_initialized' };
// // // // // //       }

// // // // // //       // Generate device ID
// // // // // //       const deviceInfo = await getDeviceInfo();
// // // // // //       const deviceId = deviceInfo.deviceId;

// // // // // //       deviceIdRef.current = deviceId;
// // // // // //       userIdRef.current = userId;
// // // // // //       frontendNameRef.current = frontendName;

// // // // // //       // 1. Request critical permissions first
// // // // // //       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

// // // // // //       if (!permissionsGranted.location) {
// // // // // //         logger.error('Location permission denied - cannot initialize');
// // // // // //         return {
// // // // // //           success: false,
// // // // // //           error: 'Location permission required',
// // // // // //           permissions: permissionsGranted,
// // // // // //         };
// // // // // //       }

// // // // // //       // 2. Start background services
// // // // // //       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
// // // // // //       const servicesStarted = await BackgroundService.start({
// // // // // //         deviceId,
// // // // // //         userId,
// // // // // //         frontendName,
// // // // // //         socketServerUrl: socketUrl,
// // // // // //       });

// // // // // //       if (!servicesStarted) {
// // // // // //         logger.error('Failed to start background services');
// // // // // //         return {
// // // // // //           success: false,
// // // // // //           error: 'Failed to start services',
// // // // // //         };
// // // // // //       }

// // // // // //       // 3. Setup socket event listeners
// // // // // //       setupSocketListeners(deviceId, frontendName);

// // // // // //       setServicesInitialized(true);
// // // // // //       logger.info('✅ Services initialized successfully');

// // // // // //       return {
// // // // // //         success: true,
// // // // // //         deviceId,
// // // // // //         permissions: permissionsGranted,
// // // // // //         socketConnected: DeviceSocketService.isConnected(),
// // // // // //       };
// // // // // //     } catch (error: any) {
// // // // // //       logger.error('Error initializing services:', error);
// // // // // //       return { success: false, error: error.message };
// // // // // //     }
// // // // // //   };

// // // // // //   // Request Permission
// // // // // //   const handleRequestPermission = async (payload: any) => {
// // // // // //     const { permissionType } = payload;
// // // // // //     logger.info(`Requesting permission: ${permissionType}`);

// // // // // //     try {
// // // // // //       const status = await PermissionManager.request(permissionType);
// // // // // //       return { status };
// // // // // //     } catch (error: any) {
// // // // // //       logger.error(`Error requesting ${permissionType}:`, error);
// // // // // //       return { status: 'denied', error: error.message };
// // // // // //     }
// // // // // //   };

// // // // // //   // Check Permission
// // // // // //   const handleCheckPermission = async (payload: any) => {
// // // // // //     const { permissionType } = payload;
// // // // // //     const status = await PermissionManager.check(permissionType);
// // // // // //     return { status };
// // // // // //   };
// // // // // //   // Check Permission
// // // // // //   const handleLogDataFromWebView = async (payload: any) => {
// // // // // //     console.log('Log from webview', payload)
// // // // // //   };

// // // // // //   // Get Current Location
// // // // // //   const handleGetCurrentLocation = async () => {
// // // // // //     try {
// // // // // //       logger.info('Getting current location...')
// // // // // //       return await LocationService.getCurrentLocation()
// // // // // //       // const location = await LocationService.getCurrentLocation();
      
// // // // // //       // if (location) {
// // // // // //       //   const locationData = {
// // // // // //       //     lat: location.coords.latitude,
// // // // // //       //     lng: location.coords.longitude,
// // // // // //       //     accuracy: location.coords.accuracy,
// // // // // //       //     heading: location.coords.heading,
// // // // // //       //     speed: location.coords.speed,
// // // // // //       //     timestamp: location.timestamp,
// // // // // //       //   };
        
// // // // // //       //   logger.info('Location retrieved successfully:', locationData);
// // // // // //       //   return locationData;
// // // // // //       //}
      
// // // // // //       // logger.warn('Could not get location');
// // // // // //       // return { error: 'Could not get location' };
// // // // // //     } catch (error: any) {
// // // // // //       logger.error('Error getting location:', error);
// // // // // //       return { error: error.message };
// // // // // //     }
// // // // // //   };

// // // // // //   // Start Location Tracking
// // // // // //   const handleStartLocationTracking = async (payload: any) => {
// // // // // //     try {
// // // // // //       if (!deviceIdRef.current) {
// // // // // //         throw new Error('Device not initialized');
// // // // // //       }

// // // // // //       await LocationService.startPersistentTracking(deviceIdRef.current);
// // // // // //       return { success: true };
// // // // // //     } catch (error: any) {
// // // // // //       logger.error('Error starting location tracking:', error);
// // // // // //       return { success: false, error: error.message };
// // // // // //     }
// // // // // //   };

// // // // // //   // Stop Location Tracking
// // // // // //   const handleStopLocationTracking = async () => {
// // // // // //     try {
// // // // // //       await LocationService.stopPersistentTracking();
// // // // // //       return { success: true };
// // // // // //     } catch (error: any) {
// // // // // //       logger.error('Error stopping location tracking:', error);
// // // // // //       return { success: false, error: error.message };
// // // // // //     }
// // // // // //   };

// // // // // //   // Show Notification
// // // // // //   const handleShowNotification = async (payload: any) => {
// // // // // //     try {
// // // // // //       await NotificationService.show(payload);
// // // // // //       return { success: true };
// // // // // //     } catch (error: any) {
// // // // // //       return { success: false, error: error.message };
// // // // // //     }
// // // // // //   };

// // // // // //   // Play Audio
// // // // // //   const handlePlayAudio = async (payload: any) => {
// // // // // //     const { soundFile } = payload;
// // // // // //     try {
// // // // // //       await AudioService.playAlert(soundFile);
// // // // // //       return { success: true };
// // // // // //     } catch (error: any) {
// // // // // //       return { success: false, error: error.message };
// // // // // //     }
// // // // // //   };

// // // // // //   // Go Online (Driver)
// // // // // //   const handleGoOnline = async (payload: any) => {
// // // // // //     try {
// // // // // //       const location = await LocationService.getCurrentLocation();

// // // // // //       if (!location) {
// // // // // //         throw new Error('Cannot get current location');
// // // // // //       }

// // // // // //       await DeviceSocketService.emit('driver:online', {
// // // // // //         driverId: userIdRef.current,
// // // // // //         location: {
// // // // // //           lat: location.coords.latitude,
// // // // // //           lng: location.coords.longitude,
// // // // // //         },
// // // // // //       });

// // // // // //       return {
// // // // // //         success: true,
// // // // // //         location: {
// // // // // //           lat: location.coords.latitude,
// // // // // //           lng: location.coords.longitude,
// // // // // //         },
// // // // // //       };
// // // // // //     } catch (error: any) {
// // // // // //       return { success: false, error: error.message };
// // // // // //     }
// // // // // //   };

// // // // // //   // Go Offline (Driver)
// // // // // //   const handleGoOffline = async (payload: any) => {
// // // // // //     try {
// // // // // //       await DeviceSocketService.emit('driver:offline', {
// // // // // //         driverId: userIdRef.current,
// // // // // //       });

// // // // // //       return { success: true };
// // // // // //     } catch (error: any) {
// // // // // //       return { success: false, error: error.message };
// // // // // //     }
// // // // // //   };

// // // // // //   // WebView error handler
// // // // // //   const handleWebViewError = (syntheticEvent: any) => {
// // // // // //     const { nativeEvent } = syntheticEvent;
// // // // // //     logger.error('WebView error:', nativeEvent);
// // // // // //     setHasError(true);
// // // // // //   };

// // // // // //   // WebView load end handler
// // // // // //   const handleLoadEnd = () => {
// // // // // //     logger.info('loading ended')
// // // // // //     setIsLoading(false);
// // // // // //   };

// // // // // //   // Render error state
// // // // // //   if (hasError) {
// // // // // //     return (
// // // // // //       <View style={styles.errorContainer}>
// // // // // //         <Text style={styles.errorTitle}>😔 Oops!</Text>
// // // // // //         <Text style={styles.errorText}>
// // // // // //           Something went wrong loading the app.
// // // // // //         </Text>
// // // // // //         <Text style={styles.errorSubtext}>
// // // // // //           Please check your internet connection and try again.
// // // // // //         </Text>
// // // // // //       </View>
// // // // // //     );
// // // // // //   }

// // // // // //   // Render offline state
// // // // // //   if (!isConnected) {
// // // // // //     return (
// // // // // //       <View style={styles.offlineContainer}>
// // // // // //         <Text style={styles.offlineTitle}>📡 No Connection</Text>
// // // // // //         <Text style={styles.offlineText}>
// // // // // //           You're currently offline. Please check your internet connection.
// // // // // //         </Text>
// // // // // //       </View>
// // // // // //     );
// // // // // //   }

// // // // // //   return (
// // // // // //     <SafeAreaView style={styles.container}>
// // // // // //       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
// // // // // //       <WebView
// // // // // //         ref={webViewRef}
// // // // // //         source={{ uri: FRONTEND_URL }}
// // // // // //         onMessage={onMessage}
// // // // // //         javaScriptEnabled={true}
// // // // // //         domStorageEnabled={true}
// // // // // //         geolocationEnabled={true}
// // // // // //         startInLoadingState={true}
// // // // // //         originWhitelist={['*']} // Allows navigation to all frontends
// // // // // //         allowsInlineMediaPlayback={true}
// // // // // //         mediaPlaybackRequiresUserAction={false}
// // // // // //         style={styles.webview}
// // // // // //         onError={handleWebViewError}
// // // // // //         onLoadEnd={handleLoadEnd}
// // // // // //         onHttpError={(syntheticEvent) => {
// // // // // //           const { nativeEvent } = syntheticEvent;
// // // // // //           logger.error('WebView HTTP error:', nativeEvent.statusCode);
// // // // // //         }}
// // // // // //         // Performance optimizations
// // // // // //         cacheEnabled={true}
// // // // // //         cacheMode="LOAD_DEFAULT"
// // // // // //         mixedContentMode="always"
// // // // // //         // Security
// // // // // //         allowFileAccess={false}
// // // // // //         allowUniversalAccessFromFileURLs={false}
// // // // // //       />
// // // // // //     </SafeAreaView>
// // // // // //   );
// // // // // // }

// // // // // // const styles = StyleSheet.create({
// // // // // //   container: {
// // // // // //     flex: 1,
// // // // // //     backgroundColor: '#FFFFFF',
// // // // // //   },
// // // // // //   webview: {
// // // // // //     flex: 1,
// // // // // //   },
// // // // // //   loadingContainer: {
// // // // // //     flex: 1,
// // // // // //     justifyContent: 'center',
// // // // // //     alignItems: 'center',
// // // // // //     backgroundColor: '#FFFFFF',
// // // // // //   },
// // // // // //   loadingText: {
// // // // // //     marginTop: 16,
// // // // // //     fontSize: 16,
// // // // // //     color: '#666666',
// // // // // //   },
// // // // // //   errorContainer: {
// // // // // //     flex: 1,
// // // // // //     justifyContent: 'center',
// // // // // //     alignItems: 'center',
// // // // // //     backgroundColor: '#FFFFFF',
// // // // // //     padding: 24,
// // // // // //   },
// // // // // //   errorTitle: {
// // // // // //     fontSize: 48,
// // // // // //     marginBottom: 16,
// // // // // //   },
// // // // // //   errorText: {
// // // // // //     fontSize: 18,
// // // // // //     fontWeight: '600',
// // // // // //     color: '#1A1A1A',
// // // // // //     textAlign: 'center',
// // // // // //     marginBottom: 8,
// // // // // //   },
// // // // // //   errorSubtext: {
// // // // // //     fontSize: 14,
// // // // // //     color: '#666666',
// // // // // //     textAlign: 'center',
// // // // // //   },
// // // // // //   offlineContainer: {
// // // // // //     flex: 1,
// // // // // //     justifyContent: 'center',
// // // // // //     alignItems: 'center',
// // // // // //     backgroundColor: '#FFFFFF',
// // // // // //     padding: 24,
// // // // // //   },
// // // // // //   offlineTitle: {
// // // // // //     fontSize: 48,
// // // // // //     marginBottom: 16,
// // // // // //   },
// // // // // //   offlineText: {
// // // // // //     fontSize: 16,
// // // // // //     color: '#666666',
// // // // // //     textAlign: 'center',
// // // // // //   },
// // // // // // });
// // // // // //OkraApp/App.tsx (Fixed)
// // // // // import React, { useRef, useEffect, useState, useCallback } from 'react';
// // // // // import {
// // // // //   SafeAreaView,
// // // // //   StatusBar,
// // // // //   Platform,
// // // // //   AppState,
// // // // //   StyleSheet,
// // // // //   View,
// // // // //   Text,
// // // // //   ActivityIndicator,
// // // // // } from 'react-native';
// // // // // import { WebView } from 'react-native-webview';
// // // // // import * as Notifications from 'expo-notifications';
// // // // // import * as TaskManager from 'expo-task-manager';
// // // // // import NetInfo from '@react-native-community/netinfo';

// // // // // import BackgroundService from './src/services/BackgroundService';
// // // // // import DeviceSocketService from './src/services/DeviceSocketService';
// // // // // import LocationService from './src/services/LocationService';
// // // // // import NotificationService from './src/services/NotificationService';
// // // // // import PermissionManager from './src/services/PermissionManager';
// // // // // import AudioService from './src/services/AudioService';
// // // // // import DeepLinkService from './src/services/DeepLinkService';
// // // // // import { getDeviceInfo } from './src/utils/device-info';
// // // // // import { logger } from './src/utils/logger';
// // // // // import { NavigationHelper } from './src/utils/navigation';
// // // // // import { CONSTANTS } from './src/utils/constants';
// // // // // import type { WebViewMessage } from './src/types/messages';
// // // // // import OkraSkeletonLoader from '@components/OkraSkeletonLoader';

// // // // // // Define background notification task
// // // // // TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
// // // // //   if (error) {
// // // // //     logger.error('Background notification task error:', error);
// // // // //     return;
// // // // //   }

// // // // //   if (data) {
// // // // //     await NotificationService.handleBackgroundNotification(data);
// // // // //   }
// // // // // });

// // // // // const FRONTEND_URL = __DEV__
// // // // //   ? Platform.OS === 'android'
// // // // //     ? 'http://10.64.246.23:3000' // Android emulator
// // // // //     : 'http://10.64.246.23:3000' // iOS simulator
// // // // //   : CONSTANTS.FRONTEND_URLS.landing;

// // // // // export default function App() {
// // // // //   const webViewRef = useRef<WebView>(null);
// // // // //   const [appState, setAppState] = useState(AppState.currentState);
// // // // //   const [servicesInitialized, setServicesInitialized] = useState(false);
// // // // //   const [isLoading, setIsLoading] = useState(true);
// // // // //   const [hasError, setHasError] = useState(false);
// // // // //   const [isConnected, setIsConnected] = useState(true);
  
// // // // //   const deviceIdRef = useRef<string | null>(null);
// // // // //   const userIdRef = useRef<string | number | null>(null);
// // // // //   const frontendNameRef = useRef<string | null>(null);
// // // // //   const isOnlineRef = useRef<boolean>(false); // Track online/offline state

// // // // //   // Send message to WebView
// // // // //   const sendToWebView = useCallback((data: any) => {
// // // // //     if (!webViewRef.current) {
// // // // //       logger.warn('Cannot send to WebView: ref is null');
// // // // //       return;
// // // // //     }

// // // // //     NavigationHelper.sendMessage(webViewRef, data.type, data.payload);
// // // // //   }, []);

// // // // //   // Initialize notification service on mount
// // // // //   useEffect(() => {
// // // // //     const initNotifications = async () => {
// // // // //       await NotificationService.initialize(sendToWebView);
// // // // //     };

// // // // //     initNotifications();

// // // // //     return () => {
// // // // //       NotificationService.cleanup();
// // // // //     };
// // // // //   }, [sendToWebView]);

// // // // //   // Monitor network connectivity
// // // // //   useEffect(() => {
// // // // //     const unsubscribe = NetInfo.addEventListener(state => {
// // // // //       setIsConnected(state.isConnected ?? false);
      
// // // // //       if (state.isConnected && servicesInitialized) {
// // // // //         // Reconnect socket if disconnected
// // // // //         if (!DeviceSocketService.isConnected()) {
// // // // //           logger.info('Network restored, reconnecting socket...');
// // // // //           DeviceSocketService.reconnect();
// // // // //         }
// // // // //       }
// // // // //     });

// // // // //     return () => unsubscribe();
// // // // //   }, [servicesInitialized]);

// // // // //   // Handle App State Changes
// // // // //   useEffect(() => {
// // // // //     const subscription = AppState.addEventListener('change', async (nextAppState) => {
// // // // //       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

// // // // //       if (appState.match(/inactive|background/) && nextAppState === 'active') {
// // // // //         // App came to foreground
// // // // //         logger.info('App resumed to foreground');

// // // // //         // Check socket connection health
// // // // //         if (servicesInitialized && !DeviceSocketService.isConnected()) {
// // // // //           logger.warn('Socket disconnected, attempting reconnect');
// // // // //           await DeviceSocketService.reconnect();
// // // // //         }

// // // // //         // Notify WebView
// // // // //         sendToWebView({ type: 'APP_RESUMED', payload: {} });
// // // // //       } else if (nextAppState === 'background') {
// // // // //         logger.info('App moved to background');
        
// // // // //         // Ensure background service is running (Android)
// // // // //         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
// // // // //           await BackgroundService.ensureForegroundService();
// // // // //         }
// // // // //       }

// // // // //       setAppState(nextAppState);
// // // // //     });

// // // // //     return () => subscription.remove();
// // // // //   }, [appState, servicesInitialized, sendToWebView]);

// // // // //   // Setup Socket Listeners (called after initialization)
// // // // //   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
// // // // //     logger.info(`Setting up socket listeners for ${frontendName}`);

// // // // //     // Listen for location requests from backend
// // // // //     DeviceSocketService.on('getCurrentLocation', async () => {
// // // // //       logger.info('Received location request from backend via socket');
// // // // //       try {
// // // // //         const location = await LocationService.getCurrentLocation();
// // // // //         if (location) {
// // // // //           // Location is automatically sent by getCurrentLocation method
// // // // //           // Also notify WebView
// // // // //           sendToWebView({
// // // // //             type: 'LOCATION_UPDATE',
// // // // //             payload: {
// // // // //               lat: location.coords.latitude,
// // // // //               lng: location.coords.longitude,
// // // // //               accuracy: location.coords.accuracy,
// // // // //               heading: location.coords.heading,
// // // // //               speed: location.coords.speed,
// // // // //             },
// // // // //           });
// // // // //         }
// // // // //       } catch (error) {
// // // // //         logger.error('Error getting location on request:', error);
// // // // //       }
// // // // //     });

// // // // //     // Listen for notifications
// // // // //     DeviceSocketService.on('showNotification', async (notification: any) => {
// // // // //       logger.info('Received notification request:', notification.type);
// // // // //       await NotificationService.show(notification);

// // // // //       // Notify WebView
// // // // //       sendToWebView({
// // // // //         type: 'NOTIFICATION_RECEIVED',
// // // // //         payload: notification,
// // // // //       });
// // // // //     });

// // // // //     // Listen for draw-over requests (Android only, non-rider)
// // // // //     if (Platform.OS === 'android' && frontendName !== 'rider') {
// // // // //       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
// // // // //         logger.info('Received draw-over request');

// // // // //         // Check if shouldDrawOver flag is set
// // // // //         if (overlayData.shouldDrawOver === false) {
// // // // //           logger.info('shouldDrawOver is false, skipping overlay');
          
// // // // //           // Still show notification and notify WebView
// // // // //           await NotificationService.showHighPriority({
// // // // //             title: 'New Ride Request',
// // // // //             body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // // //             data: overlayData,
// // // // //           });
          
// // // // //           sendToWebView({
// // // // //             type: 'RIDE_REQUEST',
// // // // //             payload: overlayData,
// // // // //           });
          
// // // // //           return;
// // // // //         }

// // // // //         // Play audio alert
// // // // //         await AudioService.playAlert("ride_request");

// // // // //         // Show overlay if permission granted
// // // // //         const hasPermission = await PermissionManager.checkDrawOverPermission();
// // // // //         if (hasPermission) {
// // // // //           await BackgroundService.showDrawOver(overlayData);
// // // // //         }

// // // // //         // Show high-priority notification
// // // // //         await NotificationService.showHighPriority({
// // // // //           title: 'New Ride Request',
// // // // //           body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // // //           data: overlayData,
// // // // //         });

// // // // //         // Always notify WebView (even if overlay not shown)
// // // // //         sendToWebView({
// // // // //           type: 'RIDE_REQUEST',
// // // // //           payload: overlayData,
// // // // //         });
// // // // //       });
// // // // //     }

// // // // //     // Listen for socket connection status
// // // // //     DeviceSocketService.on('connected', () => {
// // // // //       logger.info('Device socket connected');
// // // // //       sendToWebView({ type: 'SOCKET_CONNECTED', payload: {} });
// // // // //     });

// // // // //     DeviceSocketService.on('disconnected', (reason: string) => {
// // // // //       logger.warn('Device socket disconnected:', reason);
// // // // //       sendToWebView({
// // // // //         type: 'SOCKET_DISCONNECTED',
// // // // //         payload: { reason },
// // // // //       });
// // // // //     });
// // // // //   }, [sendToWebView]);

// // // // //   // Handle messages from WebView
// // // // //   const onMessage = async (event: any) => {
// // // // //     try {
// // // // //       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
// // // // //       const { type, requestId, payload } = message;

// // // // //       logger.info(`Received message from WebView: ${type}${requestId ? ` (requestId: ${requestId})` : ''}`);

// // // // //       let response: any = null;

// // // // //       switch (type) {
// // // // //         case 'INITIALIZE_SERVICES':
// // // // //           response = await handleInitializeServices(payload);
// // // // //           break;
// // // // //         case 'LOG_DATA':
// // // // //           response = await handleLogDataFromWebView(payload);
// // // // //           break;

// // // // //         case 'REQUEST_PERMISSION':
// // // // //           response = await handleRequestPermission(payload);
// // // // //           break;

// // // // //         case 'CHECK_PERMISSION':
// // // // //           response = await handleCheckPermission(payload);
// // // // //           break;

// // // // //         case 'GET_CURRENT_LOCATION':
// // // // //           response = await handleGetCurrentLocation();
// // // // //           break;

// // // // //         case 'START_LOCATION_TRACKING':
// // // // //           response = await handleStartLocationTracking(payload);
// // // // //           break;

// // // // //         case 'STOP_LOCATION_TRACKING':
// // // // //           response = await handleStopLocationTracking();
// // // // //           break;

// // // // //         case 'SHOW_NOTIFICATION':
// // // // //           response = await handleShowNotification(payload);
// // // // //           break;

// // // // //         case 'PLAY_AUDIO':
// // // // //           response = await handlePlayAudio(payload);
// // // // //           break;

// // // // //         case 'GO_ONLINE':
// // // // //           response = await handleGoOnline(payload);
// // // // //           break;

// // // // //         case 'GO_OFFLINE':
// // // // //           response = await handleGoOffline(payload);
// // // // //           break;

// // // // //         default:
// // // // //           logger.warn(`Unknown message type: ${type}`);
// // // // //           response = { error: 'Unknown message type' };
// // // // //       }

// // // // //       // Send response back to WebView if requestId provided
// // // // //       if (requestId) {
// // // // //         const messageToSend = {
// // // // //           type: type,
// // // // //           requestId,
// // // // //           payload: response?.error ? null : response,
// // // // //           error: response?.error || undefined
// // // // //         };
        
// // // // //         logger.info(`Sending response back to WebView for ${type}`, messageToSend);
        
// // // // //         if (webViewRef.current) {
// // // // //           webViewRef.current.postMessage(JSON.stringify(messageToSend));
// // // // //         }
// // // // //       }
// // // // //     } catch (error: any) {
// // // // //       logger.error('Error handling WebView message:', error);

// // // // //       // Send error response
// // // // //       try {
// // // // //         const { requestId, type } = JSON.parse(event.nativeEvent.data);
// // // // //         if (requestId && webViewRef.current) {
// // // // //           webViewRef.current.postMessage(JSON.stringify({
// // // // //             type: type,
// // // // //             requestId,
// // // // //             payload: null,
// // // // //             error: error.message
// // // // //           }));
// // // // //         }
// // // // //       } catch {}
// // // // //     }
// // // // //   };

// // // // //   // Initialize Services (called after user authentication)
// // // // //   const handleInitializeServices = async (payload: any) => {
// // // // //     try {
// // // // //       const { userId, frontendName, socketServerUrl } = payload;

// // // // //       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

// // // // //       if (servicesInitialized) {
// // // // //         logger.warn('Services already initialized');
// // // // //         return { success: true, reason: 'already_initialized' };
// // // // //       }

// // // // //       // Generate device ID
// // // // //       const deviceInfo = await getDeviceInfo();
// // // // //       const deviceId = deviceInfo.deviceId;

// // // // //       deviceIdRef.current = deviceId;
// // // // //       userIdRef.current = userId;
// // // // //       frontendNameRef.current = frontendName;

// // // // //       // 1. Request critical permissions first
// // // // //       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

// // // // //       if (!permissionsGranted.location) {
// // // // //         logger.error('Location permission denied - cannot initialize');
// // // // //         return {
// // // // //           success: false,
// // // // //           error: 'Location permission required',
// // // // //           permissions: permissionsGranted,
// // // // //         };
// // // // //       }

// // // // //       // 2. Start background services
// // // // //       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
// // // // //       const servicesStarted = await BackgroundService.start({
// // // // //         deviceId,
// // // // //         userId,
// // // // //         frontendName,
// // // // //         socketServerUrl: socketUrl,
// // // // //       });

// // // // //       if (!servicesStarted) {
// // // // //         logger.error('Failed to start background services');
// // // // //         return {
// // // // //           success: false,
// // // // //           error: 'Failed to start services',
// // // // //         };
// // // // //       }

// // // // //       // 3. Setup socket event listeners
// // // // //       setupSocketListeners(deviceId, frontendName);

// // // // //       setServicesInitialized(true);
// // // // //       logger.info('✅ Services initialized successfully');

// // // // //       return {
// // // // //         success: true,
// // // // //         deviceId,
// // // // //         permissions: permissionsGranted,
// // // // //         socketConnected: DeviceSocketService.isConnected(),
// // // // //       };
// // // // //     } catch (error: any) {
// // // // //       logger.error('Error initializing services:', error);
// // // // //       return { success: false, error: error.message };
// // // // //     }
// // // // //   };

// // // // //   // Request Permission
// // // // //   const handleRequestPermission = async (payload: any) => {
// // // // //     const { permissionType } = payload;
// // // // //     logger.info(`Requesting permission: ${permissionType}`);

// // // // //     try {
// // // // //       const status = await PermissionManager.request(permissionType);
// // // // //       return { status };
// // // // //     } catch (error: any) {
// // // // //       logger.error(`Error requesting ${permissionType}:`, error);
// // // // //       return { status: 'denied', error: error.message };
// // // // //     }
// // // // //   };

// // // // //   // Check Permission
// // // // //   const handleCheckPermission = async (payload: any) => {
// // // // //     const { permissionType } = payload;
// // // // //     const status = await PermissionManager.check(permissionType);
// // // // //     return { status };
// // // // //   };

// // // // //   // Log from WebView
// // // // //   const handleLogDataFromWebView = async (payload: any) => {
// // // // //     console.log('Log from webview', payload);
// // // // //     return { success: true };
// // // // //   };

// // // // //   // Get Current Location
// // // // //   const handleGetCurrentLocation = async () => {
// // // // //     try {
// // // // //       logger.info('Getting current location...');
// // // // //       const location = await LocationService.getCurrentLocation();
      
// // // // //       if (!location) {
// // // // //         logger.warn('Could not get location');
// // // // //         return { error: 'Could not get location' };
// // // // //       }

// // // // //       return location;
// // // // //     } catch (error: any) {
// // // // //       logger.error('Error getting location:', error);
// // // // //       return { error: error.message };
// // // // //     }
// // // // //   };

// // // // //   // Start Location Tracking
// // // // //   const handleStartLocationTracking = async (payload: any) => {
// // // // //     try {
// // // // //       if (!deviceIdRef.current) {
// // // // //         throw new Error('Device not initialized');
// // // // //       }

// // // // //       const success = await LocationService.startPersistentTracking(deviceIdRef.current);
      
// // // // //       if (success) {
// // // // //         logger.info('Location tracking started successfully');
// // // // //       }
      
// // // // //       return { success };
// // // // //     } catch (error: any) {
// // // // //       logger.error('Error starting location tracking:', error);
// // // // //       return { success: false, error: error.message };
// // // // //     }
// // // // //   };

// // // // //   // Stop Location Tracking
// // // // //   const handleStopLocationTracking = async () => {
// // // // //     try {
// // // // //       await LocationService.stopPersistentTracking();
// // // // //       logger.info('Location tracking stopped successfully');
// // // // //       return { success: true };
// // // // //     } catch (error: any) {
// // // // //       logger.error('Error stopping location tracking:', error);
// // // // //       return { success: false, error: error.message };
// // // // //     }
// // // // //   };

// // // // //   // Show Notification
// // // // //   const handleShowNotification = async (payload: any) => {
// // // // //     try {
// // // // //       await NotificationService.show(payload);
// // // // //       return { success: true };
// // // // //     } catch (error: any) {
// // // // //       return { success: false, error: error.message };
// // // // //     }
// // // // //   };

// // // // //   // Play Audio
// // // // //   const handlePlayAudio = async (payload: any) => {
// // // // //     const { soundFile } = payload;
// // // // //     try {
// // // // //       await AudioService.playAlert(soundFile);
// // // // //       return { success: true };
// // // // //     } catch (error: any) {
// // // // //       return { success: false, error: error.message };
// // // // //     }
// // // // //   };

// // // // //   // Go Online (Driver)
// // // // //   const handleGoOnline = async (payload: any) => {
// // // // //     try {
// // // // //       const location = await LocationService.getCurrentLocation();

// // // // //       if (!location) {
// // // // //         throw new Error('Cannot get current location');
// // // // //       }

// // // // //       // Emit driver:online event to socket
// // // // //       await DeviceSocketService.emit('driver:online', {
// // // // //         driverId: userIdRef.current,
// // // // //         location: {
// // // // //           lat: location.coords.latitude,
// // // // //           lng: location.coords.longitude,
// // // // //         },
// // // // //       });

// // // // //       // Start location tracking when going online
// // // // //       if (deviceIdRef.current) {
// // // // //         const trackingStarted = await LocationService.startPersistentTracking(deviceIdRef.current);
// // // // //         if (trackingStarted) {
// // // // //           isOnlineRef.current = true;
// // // // //           logger.info('Location tracking started when going online');
// // // // //         } else {
// // // // //           logger.warn('Failed to start location tracking when going online');
// // // // //         }
// // // // //       }

// // // // //       return {
// // // // //         success: true,
// // // // //         location: {
// // // // //           lat: location.coords.latitude,
// // // // //           lng: location.coords.longitude,
// // // // //         },
// // // // //       };
// // // // //     } catch (error: any) {
// // // // //       logger.error('Error going online:', error);
// // // // //       return { success: false, error: error.message };
// // // // //     }
// // // // //   };

// // // // //   // Go Offline (Driver)
// // // // //   const handleGoOffline = async (payload: any) => {
// // // // //     try {
// // // // //       // Emit driver:offline event to socket
// // // // //       await DeviceSocketService.emit('driver:offline', {
// // // // //         driverId: userIdRef.current,
// // // // //       });

// // // // //       // Stop location tracking when going offline
// // // // //       if (isOnlineRef.current) {
// // // // //         await LocationService.stopPersistentTracking();
// // // // //         isOnlineRef.current = false;
// // // // //         logger.info('Location tracking stopped when going offline');
// // // // //       }

// // // // //       return { success: true };
// // // // //     } catch (error: any) {
// // // // //       logger.error('Error going offline:', error);
// // // // //       return { success: false, error: error.message };
// // // // //     }
// // // // //   };

// // // // //   // WebView error handler
// // // // //   const handleWebViewError = (syntheticEvent: any) => {
// // // // //     const { nativeEvent } = syntheticEvent;
// // // // //     logger.error('WebView error:', nativeEvent);
// // // // //     setHasError(true);
// // // // //   };

// // // // //   // WebView load end handler
// // // // //   const handleLoadEnd = () => {
// // // // //     logger.info('loading ended');
// // // // //     setIsLoading(false);
// // // // //   };

// // // // //   // Render error state
// // // // //   if (hasError) {
// // // // //     return (
// // // // //       <View style={styles.errorContainer}>
// // // // //         <Text style={styles.errorTitle}>😔 Oops!</Text>
// // // // //         <Text style={styles.errorText}>
// // // // //           Something went wrong loading the app.
// // // // //         </Text>
// // // // //         <Text style={styles.errorSubtext}>
// // // // //           Please check your internet connection and try again.
// // // // //         </Text>
// // // // //       </View>
// // // // //     );
// // // // //   }

// // // // //   // Render offline state
// // // // //   if (!isConnected) {
// // // // //     return (
// // // // //       <View style={styles.offlineContainer}>
// // // // //         <Text style={styles.offlineTitle}>📡 No Connection</Text>
// // // // //         <Text style={styles.offlineText}>
// // // // //           You're currently offline. Please check your internet connection.
// // // // //         </Text>
// // // // //       </View>
// // // // //     );
// // // // //   }

// // // // //   return (
// // // // //     <SafeAreaView style={styles.container}>
// // // // //       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
// // // // //       <WebView
// // // // //         ref={webViewRef}
// // // // //         source={{ uri: FRONTEND_URL }}
// // // // //         onMessage={onMessage}
// // // // //         javaScriptEnabled={true}
// // // // //         domStorageEnabled={true}
// // // // //         geolocationEnabled={true}
// // // // //         startInLoadingState={true}
// // // // //         originWhitelist={['*']} // Allows navigation to all frontends
// // // // //         allowsInlineMediaPlayback={true}
// // // // //         mediaPlaybackRequiresUserAction={false}
// // // // //         style={styles.webview}
// // // // //         onError={handleWebViewError}
// // // // //         onLoadEnd={handleLoadEnd}
// // // // //         onHttpError={(syntheticEvent) => {
// // // // //           const { nativeEvent } = syntheticEvent;
// // // // //           logger.error('WebView HTTP error:', nativeEvent.statusCode);
// // // // //         }}
// // // // //         // Performance optimizations
// // // // //         cacheEnabled={true}
// // // // //         cacheMode="LOAD_DEFAULT"
// // // // //         mixedContentMode="always"
// // // // //         // Security
// // // // //         allowFileAccess={false}
// // // // //         allowUniversalAccessFromFileURLs={false}
// // // // //       />
// // // // //     </SafeAreaView>
// // // // //   );
// // // // // }

// // // // // const styles = StyleSheet.create({
// // // // //   container: {
// // // // //     flex: 1,
// // // // //     backgroundColor: '#FFFFFF',
// // // // //   },
// // // // //   webview: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   loadingContainer: {
// // // // //     flex: 1,
// // // // //     justifyContent: 'center',
// // // // //     alignItems: 'center',
// // // // //     backgroundColor: '#FFFFFF',
// // // // //   },
// // // // //   loadingText: {
// // // // //     marginTop: 16,
// // // // //     fontSize: 16,
// // // // //     color: '#666666',
// // // // //   },
// // // // //   errorContainer: {
// // // // //     flex: 1,
// // // // //     justifyContent: 'center',
// // // // //     alignItems: 'center',
// // // // //     backgroundColor: '#FFFFFF',
// // // // //     padding: 24,
// // // // //   },
// // // // //   errorTitle: {
// // // // //     fontSize: 48,
// // // // //     marginBottom: 16,
// // // // //   },
// // // // //   errorText: {
// // // // //     fontSize: 18,
// // // // //     fontWeight: '600',
// // // // //     color: '#1A1A1A',
// // // // //     textAlign: 'center',
// // // // //     marginBottom: 8,
// // // // //   },
// // // // //   errorSubtext: {
// // // // //     fontSize: 14,
// // // // //     color: '#666666',
// // // // //     textAlign: 'center',
// // // // //   },
// // // // //   offlineContainer: {
// // // // //     flex: 1,
// // // // //     justifyContent: 'center',
// // // // //     alignItems: 'center',
// // // // //     backgroundColor: '#FFFFFF',
// // // // //     padding: 24,
// // // // //   },
// // // // //   offlineTitle: {
// // // // //     fontSize: 48,
// // // // //     marginBottom: 16,
// // // // //   },
// // // // //   offlineText: {
// // // // //     fontSize: 16,
// // // // //     color: '#666666',
// // // // //     textAlign: 'center',
// // // // //   },
// // // // // });
// // // // //OkraApp/App.tsx (Fixed)
// // // // import React, { useRef, useEffect, useState, useCallback } from 'react';
// // // // import {
// // // //   StatusBar,
// // // //   Platform,
// // // //   AppState,
// // // //   StyleSheet,
// // // //   View,
// // // //   Text,
// // // //   ActivityIndicator,
// // // // } from 'react-native';
// // // // import { SafeAreaView } from 'react-native-safe-area-context';
// // // // import { WebView } from 'react-native-webview';
// // // // import * as Notifications from 'expo-notifications';
// // // // import * as TaskManager from 'expo-task-manager';
// // // // import NetInfo from '@react-native-community/netinfo';

// // // // import BackgroundService from './src/services/BackgroundService';
// // // // import DeviceSocketService from './src/services/DeviceSocketService';
// // // // import LocationService from './src/services/LocationService';
// // // // import NotificationService from './src/services/NotificationService';
// // // // import PermissionManager from './src/services/PermissionManager';
// // // // import AudioService from './src/services/AudioService';
// // // // import DeepLinkService from './src/services/DeepLinkService';
// // // // import { getDeviceInfo } from './src/utils/device-info';
// // // // import { logger } from './src/utils/logger';
// // // // import { NavigationHelper } from './src/utils/navigation';
// // // // import { CONSTANTS } from './src/utils/constants';
// // // // import type { WebViewMessage } from './src/types/messages';
// // // // import OkraSkeletonLoader from '@components/OkraSkeletonLoader';

// // // // // Define background notification task
// // // // TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
// // // //   if (error) {
// // // //     logger.error('Background notification task error:', error);
// // // //     return;
// // // //   }

// // // //   if (data) {
// // // //     await NotificationService.handleBackgroundNotification(data);
// // // //   }
// // // // });

// // // // const FRONTEND_URL = __DEV__
// // // //   ? Platform.OS === 'android'
// // // //     ? 'http://10.64.246.23:3000/' // Android emulator
// // // //     : 'http://10.64.246.23:3000' // iOS simulator
// // // //   : CONSTANTS.FRONTEND_URLS.landing;

// // // // export default function App() {
// // // //   const webViewRef = useRef<WebView>(null);
// // // //   const [appState, setAppState] = useState(AppState.currentState);
// // // //   const [servicesInitialized, setServicesInitialized] = useState(false);
// // // //   const [isLoading, setIsLoading] = useState(true);
// // // //   const [hasError, setHasError] = useState(false);
// // // //   const [isConnected, setIsConnected] = useState(true);
  
// // // //   const deviceIdRef = useRef<string | null>(null);
// // // //   const userIdRef = useRef<string | number | null>(null);
// // // //   const frontendNameRef = useRef<string | null>(null);
// // // //   const isOnlineRef = useRef<boolean>(false); // Track online/offline state

// // // //   // Send message to WebView
// // // //   const sendToWebView = useCallback((data: any) => {
// // // //     if (!webViewRef.current) {
// // // //       logger.warn('Cannot send to WebView: ref is null');
// // // //       return;
// // // //     }

// // // //     NavigationHelper.sendMessage(webViewRef, data.type, data.payload);
// // // //   }, []);

// // // //   // Initialize notification service on mount
// // // //   useEffect(() => {
// // // //     const initNotifications = async () => {
// // // //       await NotificationService.initialize(sendToWebView);
// // // //     };

// // // //     initNotifications();

// // // //     return () => {
// // // //       NotificationService.cleanup();
// // // //     };
// // // //   }, [sendToWebView]);

// // // //   // Monitor network connectivity
// // // //   useEffect(() => {
// // // //     const unsubscribe = NetInfo.addEventListener(state => {
// // // //       setIsConnected(state.isConnected ?? false);
      
// // // //       if (state.isConnected && servicesInitialized) {
// // // //         // Reconnect socket if disconnected
// // // //         if (!DeviceSocketService.isConnected()) {
// // // //           logger.info('Network restored, reconnecting socket...');
// // // //           DeviceSocketService.reconnect();
// // // //         }
// // // //       }
// // // //     });

// // // //     return () => unsubscribe();
// // // //   }, [servicesInitialized]);

// // // //   // Handle App State Changes
// // // //   useEffect(() => {
// // // //     const subscription = AppState.addEventListener('change', async (nextAppState) => {
// // // //       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

// // // //       if (appState.match(/inactive|background/) && nextAppState === 'active') {
// // // //         // App came to foreground
// // // //         logger.info('App resumed to foreground');

// // // //         // Check socket connection health
// // // //         if (servicesInitialized && !DeviceSocketService.isConnected()) {
// // // //           logger.warn('Socket disconnected, attempting reconnect');
// // // //           await DeviceSocketService.reconnect();
// // // //         }

// // // //         // Notify WebView
// // // //         sendToWebView({ type: 'APP_RESUMED', payload: {} });
// // // //       } else if (nextAppState === 'background') {
// // // //         logger.info('App moved to background');
        
// // // //         // Ensure background service is running (Android)
// // // //         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
// // // //           await BackgroundService.ensureForegroundService();
// // // //         }
// // // //       }

// // // //       setAppState(nextAppState);
// // // //     });

// // // //     return () => subscription.remove();
// // // //   }, [appState, servicesInitialized, sendToWebView]);

// // // //   // Setup Socket Listeners (called after initialization)
// // // //   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
// // // //     logger.info(`Setting up socket listeners for ${frontendName}`);

// // // //     // Listen for location requests from backend
// // // //     DeviceSocketService.on('getCurrentLocation', async () => {
// // // //       logger.info('Received location request from backend via socket');
// // // //       try {
// // // //         const location = await LocationService.getCurrentLocation();
// // // //         if (location) {
// // // //           // Location is automatically sent by getCurrentLocation method
// // // //           // Also notify WebView
// // // //           sendToWebView({
// // // //             type: 'LOCATION_UPDATE',
// // // //             payload: {
// // // //               lat: location.coords.latitude,
// // // //               lng: location.coords.longitude,
// // // //               accuracy: location.coords.accuracy,
// // // //               heading: location.coords.heading,
// // // //               speed: location.coords.speed,
// // // //             },
// // // //           });
// // // //         }
// // // //       } catch (error) {
// // // //         logger.error('Error getting location on request:', error);
// // // //       }
// // // //     });

// // // //     // Listen for notifications
// // // //     DeviceSocketService.on('showNotification', async (notification: any) => {
// // // //       logger.info('Received notification request:', notification.type);
// // // //       await NotificationService.show(notification);

// // // //       // Notify WebView
// // // //       sendToWebView({
// // // //         type: 'NOTIFICATION_RECEIVED',
// // // //         payload: notification,
// // // //       });
// // // //     });

// // // //     // Listen for draw-over requests (Android only, non-rider)
// // // //     if (Platform.OS === 'android' && frontendName !== 'rider') {
// // // //       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
// // // //         logger.info('Received draw-over request');

// // // //         // Check if shouldDrawOver flag is set
// // // //         if (overlayData.shouldDrawOver === false) {
// // // //           logger.info('shouldDrawOver is false, skipping overlay');
          
// // // //           // Still show notification and notify WebView
// // // //           await NotificationService.showHighPriority({
// // // //             title: 'New Ride Request',
// // // //             body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // //             data: overlayData,
// // // //           });
          
// // // //           sendToWebView({
// // // //             type: 'RIDE_REQUEST',
// // // //             payload: overlayData,
// // // //           });
          
// // // //           return;
// // // //         }

// // // //         // Play audio alert
// // // //         await AudioService.playAlert("ride_request");

// // // //         // Show overlay if permission granted
// // // //         const hasPermission = await PermissionManager.checkDrawOverPermission();
// // // //         if (hasPermission) {
// // // //           await BackgroundService.showDrawOver(overlayData);
// // // //         }

// // // //         // Show high-priority notification
// // // //         await NotificationService.showHighPriority({
// // // //           title: 'New Ride Request',
// // // //           body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // // //           data: overlayData,
// // // //         });

// // // //         // Always notify WebView (even if overlay not shown)
// // // //         sendToWebView({
// // // //           type: 'RIDE_REQUEST',
// // // //           payload: overlayData,
// // // //         });
// // // //       });
// // // //     }

// // // //     // Listen for socket connection status
// // // //     DeviceSocketService.on('connected', () => {
// // // //       logger.info('Device socket connected');
// // // //       sendToWebView({ type: 'SOCKET_CONNECTED', payload: {} });
// // // //     });

// // // //     DeviceSocketService.on('disconnected', (reason: string) => {
// // // //       logger.warn('Device socket disconnected:', reason);
// // // //       sendToWebView({
// // // //         type: 'SOCKET_DISCONNECTED',
// // // //         payload: { reason },
// // // //       });
// // // //     });
// // // //   }, [sendToWebView]);

// // // //   // Handle messages from WebView
// // // //   const onMessage = async (event: any) => {
// // // //     try {
// // // //       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
// // // //       const { type, requestId, payload } = message;

// // // //       logger.info(`Received message from WebView: ${type}${requestId ? ` (requestId: ${requestId})` : ''}`);

// // // //       let response: any = null;

// // // //       switch (type) {
// // // //         case 'INITIALIZE_SERVICES':
// // // //           response = await handleInitializeServices(payload);
// // // //           break;
// // // //         case 'LOG_DATA':
// // // //           response = await handleLogDataFromWebView(payload);
// // // //           break;

// // // //         case 'REQUEST_PERMISSION':
// // // //           response = await handleRequestPermission(payload);
// // // //           break;

// // // //         case 'CHECK_PERMISSION':
// // // //           response = await handleCheckPermission(payload);
// // // //           break;

// // // //         case 'GET_CURRENT_LOCATION':
// // // //           response = await handleGetCurrentLocation();
// // // //           break;

// // // //         case 'START_LOCATION_TRACKING':
// // // //           response = await handleStartLocationTracking(payload);
// // // //           break;

// // // //         case 'STOP_LOCATION_TRACKING':
// // // //           response = await handleStopLocationTracking();
// // // //           break;

// // // //         case 'SHOW_NOTIFICATION':
// // // //           response = await handleShowNotification(payload);
// // // //           break;

// // // //         case 'PLAY_AUDIO':
// // // //           response = await handlePlayAudio(payload);
// // // //           break;

// // // //         case 'GO_ONLINE':
// // // //           response = await handleGoOnline(payload);
// // // //           break;

// // // //         case 'GO_OFFLINE':
// // // //           response = await handleGoOffline(payload);
// // // //           break;

// // // //         default:
// // // //           logger.warn(`Unknown message type: ${type}`);
// // // //           response = { error: 'Unknown message type' };
// // // //       }

// // // //       // Send response back to WebView if requestId provided
// // // //       if (requestId) {
// // // //         const messageToSend = {
// // // //           type: type,
// // // //           requestId,
// // // //           payload: response?.error ? null : response,
// // // //           error: response?.error || undefined
// // // //         };
        
// // // //         logger.info(`Sending response back to WebView for ${type}`, messageToSend);
        
// // // //         if (webViewRef.current) {
// // // //           webViewRef.current.postMessage(JSON.stringify(messageToSend));
// // // //         }
// // // //       }
// // // //     } catch (error: any) {
// // // //       logger.error('Error handling WebView message:', error);

// // // //       // Send error response
// // // //       try {
// // // //         const { requestId, type } = JSON.parse(event.nativeEvent.data);
// // // //         if (requestId && webViewRef.current) {
// // // //           webViewRef.current.postMessage(JSON.stringify({
// // // //             type: type,
// // // //             requestId,
// // // //             payload: null,
// // // //             error: error.message
// // // //           }));
// // // //         }
// // // //       } catch {}
// // // //     }
// // // //   };

// // // //   // Initialize Services (called after user authentication)
// // // //   const handleInitializeServices = async (payload: any) => {
// // // //     try {
// // // //       const { userId, frontendName, socketServerUrl } = payload;

// // // //       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

// // // //       if (servicesInitialized) {
// // // //         logger.warn('Services already initialized');
// // // //         return { success: true, reason: 'already_initialized' };
// // // //       }

// // // //       // Generate device ID
// // // //       const deviceInfo = await getDeviceInfo();
// // // //       const deviceId = deviceInfo.deviceId;

// // // //       deviceIdRef.current = deviceId;
// // // //       userIdRef.current = userId;
// // // //       frontendNameRef.current = frontendName;

// // // //       // Set device ID in LocationService
// // // //       LocationService.setDeviceId(deviceId);

// // // //       // 1. Request critical permissions first
// // // //       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

// // // //       if (!permissionsGranted.location) {
// // // //         logger.error('Location permission denied - cannot initialize');
// // // //         return {
// // // //           success: false,
// // // //           error: 'Location permission required',
// // // //           permissions: permissionsGranted,
// // // //         };
// // // //       }

// // // //       // 2. Start background services
// // // //       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
// // // //       const servicesStarted = await BackgroundService.start({
// // // //         deviceId,
// // // //         userId,
// // // //         frontendName,
// // // //         socketServerUrl: socketUrl,
// // // //       });

// // // //       if (!servicesStarted) {
// // // //         logger.error('Failed to start background services');
// // // //         return {
// // // //           success: false,
// // // //           error: 'Failed to start services',
// // // //         };
// // // //       }

// // // //       // 3. Setup socket event listeners
// // // //       setupSocketListeners(deviceId, frontendName);

// // // //       setServicesInitialized(true);
// // // //       logger.info('✅ Services initialized successfully');

// // // //       return {
// // // //         success: true,
// // // //         deviceId,
// // // //         permissions: permissionsGranted,
// // // //         socketConnected: DeviceSocketService.isConnected(),
// // // //       };
// // // //     } catch (error: any) {
// // // //       logger.error('Error initializing services:', error);
// // // //       return { success: false, error: error.message };
// // // //     }
// // // //   };

// // // //   // Request Permission
// // // //   const handleRequestPermission = async (payload: any) => {
// // // //     const { permissionType } = payload;
// // // //     logger.info(`Requesting permission: ${permissionType}`);

// // // //     try {
// // // //       const status = await PermissionManager.request(permissionType);
// // // //       return { status };
// // // //     } catch (error: any) {
// // // //       logger.error(`Error requesting ${permissionType}:`, error);
// // // //       return { status: 'denied', error: error.message };
// // // //     }
// // // //   };

// // // //   // Check Permission
// // // //   const handleCheckPermission = async (payload: any) => {
// // // //     const { permissionType } = payload;
// // // //     const status = await PermissionManager.check(permissionType);
// // // //     return { status };
// // // //   };

// // // //   // Log from WebView
// // // //   const handleLogDataFromWebView = async (payload: any) => {
// // // //     console.log('Log from webview', payload);
// // // //     return { success: true };
// // // //   };

// // // //   // Get Current Location
// // // //   const handleGetCurrentLocation = async () => {
// // // //     try {
// // // //       logger.info('Getting current location...');
// // // //       const location = await LocationService.getCurrentLocation();
      
// // // //       if (!location) {
// // // //         logger.warn('Could not get location');
// // // //         return { error: 'Could not get location' };
// // // //       }

// // // //       return location;
// // // //     } catch (error: any) {
// // // //       logger.error('Error getting location:', error);
// // // //       return { error: error.message };
// // // //     }
// // // //   };

// // // //   // Start Location Tracking
// // // //   const handleStartLocationTracking = async (payload: any) => {
// // // //     try {
// // // //       if (!deviceIdRef.current) {
// // // //         throw new Error('Device not initialized');
// // // //       }

// // // //       const success = await LocationService.startPersistentTracking(deviceIdRef.current);
      
// // // //       if (success) {
// // // //         logger.info('Location tracking started successfully');
// // // //       }
      
// // // //       return { success };
// // // //     } catch (error: any) {
// // // //       logger.error('Error starting location tracking:', error);
// // // //       return { success: false, error: error.message };
// // // //     }
// // // //   };

// // // //   // Stop Location Tracking
// // // //   const handleStopLocationTracking = async () => {
// // // //     try {
// // // //       await LocationService.stopPersistentTracking();
// // // //       logger.info('Location tracking stopped successfully');
// // // //       return { success: true };
// // // //     } catch (error: any) {
// // // //       logger.error('Error stopping location tracking:', error);
// // // //       return { success: false, error: error.message };
// // // //     }
// // // //   };

// // // //   // Show Notification
// // // //   const handleShowNotification = async (payload: any) => {
// // // //     try {
// // // //       await NotificationService.show(payload);
// // // //       return { success: true };
// // // //     } catch (error: any) {
// // // //       return { success: false, error: error.message };
// // // //     }
// // // //   };

// // // //   // Play Audio
// // // //   const handlePlayAudio = async (payload: any) => {
// // // //     const { soundFile } = payload;
// // // //     try {
// // // //       await AudioService.playAlert(soundFile);
// // // //       return { success: true };
// // // //     } catch (error: any) {
// // // //       return { success: false, error: error.message };
// // // //     }
// // // //   };

// // // //   // Go Online (Driver)
// // // //   const handleGoOnline = async (payload: any) => {
// // // //     try {
// // // //       const location = await LocationService.getCurrentLocation();

// // // //       if (!location) {
// // // //         throw new Error('Cannot get current location');
// // // //       }

// // // //       // Emit driver:online event to socket
// // // //       await DeviceSocketService.emit('driver:online', {
// // // //         driverId: userIdRef.current,
// // // //         location: {
// // // //           lat: location.coords.latitude,
// // // //           lng: location.coords.longitude,
// // // //         },
// // // //       });

// // // //       // Start location tracking when going online
// // // //       if (deviceIdRef.current) {
// // // //         const trackingStarted = await LocationService.startPersistentTracking(deviceIdRef.current);
// // // //         if (trackingStarted) {
// // // //           isOnlineRef.current = true;
// // // //           logger.info('Location tracking started when going online');
// // // //         } else {
// // // //           logger.warn('Failed to start location tracking when going online');
// // // //         }
// // // //       }

// // // //       return {
// // // //         success: true,
// // // //         location: {
// // // //           lat: location.coords.latitude,
// // // //           lng: location.coords.longitude,
// // // //         },
// // // //       };
// // // //     } catch (error: any) {
// // // //       logger.error('Error going online:', error);
// // // //       return { success: false, error: error.message };
// // // //     }
// // // //   };

// // // //   // Go Offline (Driver)
// // // //   const handleGoOffline = async (payload: any) => {
// // // //     try {
// // // //       // Emit driver:offline event to socket
// // // //       await DeviceSocketService.emit('driver:offline', {
// // // //         driverId: userIdRef.current,
// // // //       });

// // // //       // Stop location tracking when going offline
// // // //       if (isOnlineRef.current) {
// // // //         await LocationService.stopPersistentTracking();
// // // //         isOnlineRef.current = false;
// // // //         logger.info('Location tracking stopped when going offline');
// // // //       }

// // // //       return { success: true };
// // // //     } catch (error: any) {
// // // //       logger.error('Error going offline:', error);
// // // //       return { success: false, error: error.message };
// // // //     }
// // // //   };

// // // //   // WebView error handler
// // // //   const handleWebViewError = (syntheticEvent: any) => {
// // // //     const { nativeEvent } = syntheticEvent;
// // // //     logger.error('WebView error:', nativeEvent);
// // // //     setHasError(true);
// // // //   };

// // // //   // WebView load end handler
// // // //   const handleLoadEnd = () => {
// // // //     logger.info('loading ended');
// // // //     setIsLoading(false);
// // // //   };

// // // //   // Render error state
// // // //   if (hasError) {
// // // //     return (
// // // //       <View style={styles.errorContainer}>
// // // //         <Text style={styles.errorTitle}>😔 Oops!</Text>
// // // //         <Text style={styles.errorText}>
// // // //           Something went wrong loading the app.
// // // //         </Text>
// // // //         <Text style={styles.errorSubtext}>
// // // //           Please check your internet connection and try again.
// // // //         </Text>
// // // //       </View>
// // // //     );
// // // //   }

// // // //   // Render offline state
// // // //   if (!isConnected) {
// // // //     return (
// // // //       <View style={styles.offlineContainer}>
// // // //         <Text style={styles.offlineTitle}>📡 No Connection</Text>
// // // //         <Text style={styles.offlineText}>
// // // //           You're currently offline. Please check your internet connection.
// // // //         </Text>
// // // //       </View>
// // // //     );
// // // //   }

// // // //   return (
// // // //     <SafeAreaView style={styles.container}>
// // // //       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
// // // //       <WebView
// // // //         ref={webViewRef}
// // // //         source={{ uri: FRONTEND_URL }}
// // // //         onMessage={onMessage}
// // // //         javaScriptEnabled={true}
// // // //         domStorageEnabled={true}
// // // //         geolocationEnabled={true}
// // // //         startInLoadingState={true}
// // // //         originWhitelist={['*']} // Allows navigation to all frontends
// // // //         allowsInlineMediaPlayback={true}
// // // //         mediaPlaybackRequiresUserAction={false}
// // // //         style={styles.webview}
// // // //         onError={handleWebViewError}
// // // //         onLoadEnd={handleLoadEnd}
// // // //         onHttpError={(syntheticEvent) => {
// // // //           const { nativeEvent } = syntheticEvent;
// // // //           logger.error('WebView HTTP error:', nativeEvent.statusCode);
// // // //         }}
// // // //         // Performance optimizations
// // // //         cacheEnabled={true}
// // // //         cacheMode="LOAD_DEFAULT"
// // // //         mixedContentMode="always"
// // // //         // Security
// // // //         allowFileAccess={false}
// // // //         allowUniversalAccessFromFileURLs={false}
// // // //       />
// // // //     </SafeAreaView>
// // // //   );
// // // // }

// // // // const styles = StyleSheet.create({
// // // //   container: {
// // // //     flex: 1,
// // // //     backgroundColor: '#FFFFFF',
// // // //   },
// // // //   webview: {
// // // //     flex: 1,
// // // //   },
// // // //   loadingContainer: {
// // // //     flex: 1,
// // // //     justifyContent: 'center',
// // // //     alignItems: 'center',
// // // //     backgroundColor: '#FFFFFF',
// // // //   },
// // // //   loadingText: {
// // // //     marginTop: 16,
// // // //     fontSize: 16,
// // // //     color: '#666666',
// // // //   },
// // // //   errorContainer: {
// // // //     flex: 1,
// // // //     justifyContent: 'center',
// // // //     alignItems: 'center',
// // // //     backgroundColor: '#FFFFFF',
// // // //     padding: 24,
// // // //   },
// // // //   errorTitle: {
// // // //     fontSize: 48,
// // // //     marginBottom: 16,
// // // //   },
// // // //   errorText: {
// // // //     fontSize: 18,
// // // //     fontWeight: '600',
// // // //     color: '#1A1A1A',
// // // //     textAlign: 'center',
// // // //     marginBottom: 8,
// // // //   },
// // // //   errorSubtext: {
// // // //     fontSize: 14,
// // // //     color: '#666666',
// // // //     textAlign: 'center',
// // // //   },
// // // //   offlineContainer: {
// // // //     flex: 1,
// // // //     justifyContent: 'center',
// // // //     alignItems: 'center',
// // // //     backgroundColor: '#FFFFFF',
// // // //     padding: 24,
// // // //   },
// // // //   offlineTitle: {
// // // //     fontSize: 48,
// // // //     marginBottom: 16,
// // // //   },
// // // //   offlineText: {
// // // //     fontSize: 16,
// // // //     color: '#666666',
// // // //     textAlign: 'center',
// // // //   },
// // // // });
// // // //OkraApp/App.tsx (Complete with Socket Event Listeners)
// // // import React, { useRef, useEffect, useState, useCallback } from 'react';
// // // import {
// // //   StatusBar,
// // //   Platform,
// // //   AppState,
// // //   StyleSheet,
// // //   View,
// // //   Text,
// // //   ActivityIndicator,
// // // } from 'react-native';
// // // import { SafeAreaView } from 'react-native-safe-area-context';
// // // import { WebView } from 'react-native-webview';
// // // import * as Notifications from 'expo-notifications';
// // // import * as TaskManager from 'expo-task-manager';
// // // import NetInfo from '@react-native-community/netinfo';

// // // import BackgroundService from './src/services/BackgroundService';
// // // import DeviceSocketService from './src/services/DeviceSocketService';
// // // import LocationService from './src/services/LocationService';
// // // import NotificationService from './src/services/NotificationService';
// // // import PermissionManager from './src/services/PermissionManager';
// // // import AudioService from './src/services/AudioService';
// // // import DeepLinkService from './src/services/DeepLinkService';
// // // import { getDeviceInfo } from './src/utils/device-info';
// // // import { logger } from './src/utils/logger';
// // // import { NavigationHelper } from './src/utils/navigation';
// // // import { CONSTANTS } from './src/utils/constants';
// // // import type { WebViewMessage } from './src/types/messages';
// // // import OkraSkeletonLoader from '@components/OkraSkeletonLoader';
// // // import { RideRequestModal } from './src/components/RideRequestModal';

// // // // Define background notification task
// // // TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
// // //   if (error) {
// // //     logger.error('Background notification task error:', error);
// // //     return;
// // //   }

// // //   if (data) {
// // //     await NotificationService.handleBackgroundNotification(data);
// // //   }
// // // });

// // // const API_URL = CONSTANTS.BACKEND_URL
// // // const FRONTEND_URL = __DEV__
// // //   ? Platform.OS === 'android'
// // //     ? 'http://10.64.246.23:3000/' // Android emulator
// // //     : 'http://10.64.246.23:3000' // iOS simulator
// // //   : CONSTANTS.FRONTEND_URLS.landing;

// // //   // helper function to get frontend URLs
// // // const getFrontendUrls = async () => {
// // //   try {
// // //     const response = await fetch(`${API_URL}/frontend-url`);
// // //     if (!response.ok) {
// // //       throw new Error('Failed to fetch URLs');
// // //     }
// // //     const res = await response.json();
// // //     return res?.data?.paths || {};
// // //   } catch (error) {
// // //     logger.error('Error fetching frontend URLs:', error);
// // //     return {};
// // //   }
// // // }

// // // export default function App() {
// // //   const webViewRef = useRef<WebView>(null);
// // //   const [appState, setAppState] = useState(AppState.currentState);
// // //   const [servicesInitialized, setServicesInitialized] = useState(false);
// // //   const [isLoading, setIsLoading] = useState(true);
// // //   const [hasError, setHasError] = useState(false);
// // //   const [isConnected, setIsConnected] = useState(true);
  
// // //   const deviceIdRef = useRef<string | null>(null);
// // //   const userIdRef = useRef<string | number | null>(null);
// // //   const frontendNameRef = useRef<string | null>(null);
// // //   const isOnlineRef = useRef<boolean>(false); // Track online/offline state
// // //   const [showRideRequestModal, setShowRideRequestModal] = useState(false);
// // //   const [currentRideRequest, setCurrentRideRequest] = useState<any>(null);

// // //   // Send message to WebView
// // //   const sendToWebView = useCallback((data: any) => {
// // //     if (!webViewRef.current) {
// // //       logger.warn('Cannot send to WebView: ref is null');
// // //       return;
// // //     }

// // //     NavigationHelper.sendMessage(webViewRef, data.type, data.payload);
// // //   }, []);

// // //     // Add these handler functions (add before setupSocketListeners)
// // // const handleAcceptRide = async (rideId: string) => {
// // //   logger.info('Accepting ride:', rideId);
  
// // //   if (!currentRideRequest) {
// // //     logger.error('No current ride request data');
// // //     return;
// // //   }
  
// // //   setShowRideRequestModal(false);
  
// // //   try {
// // //     setIsLoading(true);
    
// // //     // Call the accept ride API endpoint
// // //     const { deviceId } = await getDeviceInfo();
// // //     const response = await fetch(`${API_URL}/devices/acceptride/${deviceId}`, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //         // Add authorization if needed
// // //         // 'Authorization': `Bearer ${token}`,
// // //       },
// // //     });

// // //     if (!response.ok) {
// // //       throw new Error('Failed to accept ride');
// // //     }

// // //     const result = await response.json();
// // //     logger.info('Ride accepted successfully:', result);

// // //     // Emit socket event for real-time updates
// // //     await DeviceSocketService.emit('ride:accepted', { rideId });

// // //     // Get frontend URLs
// // //     const urls = await getFrontendUrls();
    
// // //     // Determine the correct URL based on userType from the request data
// // //     let targetUrl = '';
// // //     const userType = currentRideRequest.userType;
    
// // //     if (userType === 'driver') {
// // //       targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
// // //     } else if (userType === 'delivery') {
// // //       targetUrl = urls['okra-delivery-app'] || 'http://10.64.246.23:3003';
// // //     } else if (userType === 'conductor') {
// // //       targetUrl = urls['okra-conductor-app'] || 'http://10.64.246.23:3004';
// // //     } else {
// // //       logger.warn(`Unknown userType: ${userType}, defaulting to driver app`);
// // //       targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
// // //     }
    
// // //     // Navigate to active ride page
// // //     if (webViewRef.current) {
// // //        webViewRef.current.injectJavaScript(`
// // //         window.location.href = "${targetUrl}/active-ride/${rideId}";
// // //       `)
// // //     }
    
// // //     logger.info(`Navigating ${userType} to: ${targetUrl}/active-ride/${rideId}`);
    
// // //     // Clear the current request
// // //     setCurrentRideRequest(null);
    
// // //   } catch (error) {
// // //     logger.error('Error accepting ride:', error);
    
// // //     // Show error to user
// // //     setShowRideRequestModal(true); // Show modal again
    
// // //     // Optionally show an alert
// // //     if (webViewRef.current) {
// // //       webViewRef.current.injectJavaScript(`
// // //         alert('Failed to accept ride. Please try again.');
// // //       `);
// // //     }
// // //   } finally {
// // //     setIsLoading(false);
// // //   }
// // // };

// // // const handleDeclineRide = async (rideId: string) => {
// // //   logger.info('Declining ride:', rideId);
  
// // //   if (!currentRideRequest) {
// // //     logger.error('No current ride request data');
// // //     return;
// // //   }
  
// // //   setShowRideRequestModal(false);
  
// // //   try {
// // //     setIsLoading(true);
    
// // //     // Call the decline ride API endpoint
// // //     const response = await fetch(`${API_URL}/rides/${rideId}/decline`, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //         // Add authorization if needed
// // //         // 'Authorization': `Bearer ${token}`,
// // //       },
// // //       body: JSON.stringify({
// // //         reason: 'Driver declined',
// // //       }),
// // //     });

// // //     if (!response.ok) {
// // //       throw new Error('Failed to decline ride');
// // //     }

// // //     const result = await response.json();
// // //     logger.info('Ride declined successfully:', result);

// // //     // Emit socket event for real-time updates
// // //     await DeviceSocketService.emit('ride:decline', { 
// // //       rideId, 
// // //       reason: 'Driver declined' 
// // //     });
    
// // //     logger.info(`Ride declined by ${currentRideRequest.userType}`);
    
// // //     // Clear the current request
// // //     setCurrentRideRequest(null);
    
// // //   } catch (error) {
// // //     logger.error('Error declining ride:', error);
    
// // //     // Still clear the request even if API fails
// // //     setCurrentRideRequest(null);
// // //   } finally {
// // //     setIsLoading(false);
// // //   }
// // // };

// // //   // Initialize notification service on mount
// // //   useEffect(() => {
// // //     const initNotifications = async () => {
// // //       await NotificationService.initialize(sendToWebView);
// // //     };

// // //     initNotifications();

// // //     return () => {
// // //       NotificationService.cleanup();
// // //     };
// // //   }, [sendToWebView]);

// // //   // Monitor network connectivity
// // //   useEffect(() => {
// // //     const handleActiveRide = async ()=>{
// // //       //socketlog
// // //           const { deviceId } = await getDeviceInfo();
// // //           console.log('rides API_URL',API_URL)
// // //           const rideResponse = await fetch(`${API_URL}/devices/activeride/${deviceId}`);
// // //           console.log("Response received:", rideResponse.status);
// // //           if (!rideResponse.ok) {
// // //             throw new Error('Failed to fetch URLs')
// // //           }
// // //           const rideRes = await rideResponse.json();
// // //           console.log('rides-ridesResponse',rideRes)
// // //           if(rideRes.data){
// // //             const urls = await getFrontendUrls();
// // //              if(typeof window !== "undefined" && rideRes?.success){
// // //               const ride = rideRes?.data // get actual active ride itself
// // //               if(rideRes.userRole === "rider"){
// // //                   if (ride.rideStatus === 'pending') {
// // //                     webViewRef.current?.injectJavaScript(`
// // //                         window.location.href = "${urls['okra-rider-app']}/finding-driver?rideId=${ride.id}";
// // //                     `)
// // //                   } else if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// // //                     webViewRef.current?.injectJavaScript(`
// // //                         window.location.href = "${urls['okra-rider-app']}/tracking?rideId=${ride.id}";
// // //                     `)
// // //                   }
// // //               }
// // //               else if(rideRes.userRole === "driver"){
// // //                   if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// // //                       webViewRef.current?.injectJavaScript(`
// // //                         window.location.href = "${urls['okra-driver-app']}/active-ride/${ride.id}";
// // //                       `)
// // //                   }
// // //               }
// // //               else if(rideRes.userRole === "delivery"){
// // //                   if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// // //                       webViewRef.current?.injectJavaScript(`
// // //                         window.location.href = "${urls['okra-delivery-app']}/active-ride/${ride.id}";
// // //                       `)
// // //                   }
// // //               }
// // //               else if(rideRes.userRole === "conductor"){
// // //                   if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// // //                       webViewRef.current?.injectJavaScript(`
// // //                         window.location.href = "${urls['okra-conductor-app']}/active-ride/${ride.id}";
// // //                       `)
// // //                   }
// // //               }
// // //              }
// // //           }
          
 
// // //       //     setFrontendUrls({
// // //       //   riderApp: urls['okra-rider-app'] || 'http://10.64.246.23:3001/home',
// // //       //   driverApp: urls['okra-driver-app'] || 'http://10.64.246.23:3002/home',
// // //       //   deliveryApp: urls['okra-delivery-app'] || 'http://10.64.246.23:3001',
// // //       //   conductorApp: urls['okra-conductor-app'] || 'http://10.64.246.23:3001'
// // //       // });
// // //     }
// // //     handleActiveRide()
// // //     const unsubscribe = NetInfo.addEventListener(state => {
// // //       setIsConnected(state.isConnected ?? false);
      
// // //       if (state.isConnected && servicesInitialized) {
// // //         // Reconnect socket if disconnected
// // //         if (!DeviceSocketService.isConnected()) {
// // //           logger.info('Network restored, reconnecting socket...');
// // //           DeviceSocketService.reconnect();
// // //         }
// // //       }
// // //     });

// // //     return () => unsubscribe();
// // //   }, [servicesInitialized]);
 
// // //   // Handle App State Changes
// // //   useEffect(() => {
// // //     const subscription = AppState.addEventListener('change', async (nextAppState) => {
// // //       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

// // //       if (appState.match(/inactive|background/) && nextAppState === 'active') {
// // //         // App came to foreground
// // //         logger.info('App resumed to foreground');

// // //         // Check socket connection health
// // //         if (servicesInitialized && !DeviceSocketService.isConnected()) {
// // //           logger.warn('Socket disconnected, attempting reconnect');
// // //           await DeviceSocketService.reconnect();
// // //         }

// // //         // Notify WebView
// // //         sendToWebView({ type: 'APP_RESUMED', payload: {} });
// // //       } else if (nextAppState === 'background') {
// // //         logger.info('App moved to background');
        
// // //         // Ensure background service is running (Android)
// // //         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
// // //           await BackgroundService.ensureForegroundService();
// // //         }
// // //       }

// // //       setAppState(nextAppState);
// // //     });

// // //     return () => subscription.remove();
// // //   }, [appState, servicesInitialized, sendToWebView]);


// // //   // Setup Socket Listeners (called after initialization)
// // //   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
// // //     logger.info(`Setting up socket listeners for ${frontendName}`);

// // //     // ==================== CORE DEVICE EVENTS ====================
    
// // //     // Listen for location requests from backend
// // //     DeviceSocketService.on('getCurrentLocation', async () => {
// // //       console.log('socketlog- getCurrentLocation: Backend requested current location');
// // //       logger.info('Received location request from backend via socket');
// // //       try {
// // //         const location = await LocationService.getCurrentLocation();
// // //         if (location) {
// // //           // Location is automatically sent by getCurrentLocation method
// // //           // Also notify WebView
// // //           sendToWebView({
// // //             type: 'LOCATION_UPDATE',
// // //             payload: {
// // //               lat: location.coords.latitude,
// // //               lng: location.coords.longitude,
// // //               accuracy: location.coords.accuracy,
// // //               heading: location.coords.heading,
// // //               speed: location.coords.speed,
// // //             },
// // //           });
// // //         }
// // //       } catch (error) {
// // //         logger.error('Error getting location on request:', error);
// // //       }
// // //     });

// // //     // Listen for notifications
// // //     DeviceSocketService.on('showNotification', async (notification: any) => {
// // //       console.log('socketlog- showNotification:', JSON.stringify(notification, null, 2));
// // //       logger.info('Received notification request:', notification.type);
// // //       await NotificationService.show(notification);

// // //       // Notify WebView
// // //       sendToWebView({
// // //         type: 'NOTIFICATION_RECEIVED',
// // //         payload: notification,
// // //       });
// // //     });

// // //     // Listen for draw-over requests (Android only, non-rider)
// // //     if (Platform.OS === 'android' && frontendName !== 'rider') {
// // //       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
// // //         console.log('socketlog- showDrawOver:', JSON.stringify(overlayData, null, 2));
// // //         logger.info('Received draw-over request');

// // //         // Check if shouldDrawOver flag is set
// // //         if (overlayData.shouldDrawOver === false) {
// // //           logger.info('shouldDrawOver is false, skipping overlay');
          
// // //           // Still show notification and notify WebView
// // //           await NotificationService.showHighPriority({
// // //             title: 'New Ride Request',
// // //             body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // //             data: overlayData,
// // //           });
          
// // //           sendToWebView({
// // //             type: 'RIDE_REQUEST',
// // //             payload: overlayData,
// // //           });
          
// // //           return;
// // //         }

// // //         // Play audio alert
// // //         await AudioService.playAlert("ride_request");

// // //         // Show overlay if permission granted
// // //         const hasPermission = await PermissionManager.checkDrawOverPermission();
// // //         if (hasPermission) {
// // //           await BackgroundService.showDrawOver(overlayData);
// // //         }

// // //         // Show high-priority notification
// // //         await NotificationService.showHighPriority({
// // //           title: 'New Ride Request',
// // //           body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// // //           data: overlayData,
// // //         });

// // //         // Always notify WebView (even if overlay not shown)
// // //         sendToWebView({
// // //           type: 'RIDE_REQUEST',
// // //           payload: overlayData,
// // //         });
// // //       });
// // //     }

// // //     // ==================== RIDE LIFECYCLE EVENTS ====================
    
// // //     DeviceSocketService.on('ride:request:created', (data: any) => {
// // //       console.log('socketlog- ride:request:created:', JSON.stringify(data, null, 2));
// // //       sendToWebView({
// // //         type: 'RIDE_REQUEST_CREATED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:request:new', async (data: any) => {
// // //       console.log('socketlog- ride:request:new:', JSON.stringify(data, null, 2));
      
// // //       // Play notification sound for new ride request
// // //       await AudioService.playAlert('ride_request');
// // //        // Show native modal overlay with the request data
// // //       setCurrentRideRequest(data);
// // //       setShowRideRequestModal(true);
// // //       // Show notification
// // //       await NotificationService.showHighPriority({
// // //         title: 'New Ride Request',
// // //         body: `${data.distance?.toFixed(1) || 0}km away • K${data.estimatedFare?.toFixed(2) || 0}`,
// // //         data,
// // //       });
       
// // //       sendToWebView({
// // //         type: 'RIDE_REQUEST_NEW',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:request:received', async (data: any) => {
// // //       console.log('socketlog- ride:request:received:', data);
      
// // //       // Play notification sound
// // //       await AudioService.playAlert('ride_request');
// // //         // Show native modal overlay with the request data
// // //       // Show notification
// // //       setCurrentRideRequest(data);
// // //       setShowRideRequestModal(true);
// // //       await NotificationService.showHighPriority({
// // //         title: 'New Ride Request',
// // //         body: `${data.distance?.toFixed(1) || 0}km away • K${data.estimatedFare?.toFixed(2) || 0}`,
// // //         data,
// // //       });  
      
      
// // //       sendToWebView({
// // //         type: 'RIDE_REQUEST_RECEIVED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:accepted', async (data: any) => {
// // //       console.log('socketlog- ride:accepted:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Ride Accepted',
// // //         body: 'Your driver has accepted the ride request',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'RIDE_ACCEPTED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:taken', (data: any) => {
// // //       console.log('socketlog- ride:taken:', JSON.stringify(data, null, 2));
// // //       sendToWebView({
// // //         type: 'RIDE_TAKEN',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:driver:arrived', async (data: any) => {
// // //       console.log('socketlog- ride:driver:arrived:', JSON.stringify(data, null, 2));
      
// // //       // Play arrival sound
// // //       await AudioService.playAlert('driver_arrived');
      
// // //       // Show notification
// // //       await NotificationService.showHighPriority({
// // //         title: 'Driver Arrived',
// // //         body: 'Your driver is waiting for you',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'DRIVER_ARRIVED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:trip:started', async (data: any) => {
// // //       console.log('socketlog- ride:trip:started:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Trip Started',
// // //         body: 'Your trip has begun. Safe travels!',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'TRIP_STARTED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:trip:completed', async (data: any) => {
// // //       console.log('socketlog- ride:trip:completed:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Trip Completed',
// // //         body: `Fare: K${data.finalFare?.toFixed(2) || 0}`,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'TRIP_COMPLETED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:cancelled', async (data: any) => {
// // //       console.log('socketlog- ride:cancelled:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Ride Cancelled',
// // //         body: data.reason || 'The ride has been cancelled',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'RIDE_CANCELLED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:accept:success', (data: any) => {
// // //       console.log('socketlog- ride:accept:success:', JSON.stringify(data, null, 2));
// // //       sendToWebView({
// // //         type: 'RIDE_ACCEPT_SUCCESS',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('ride:decline:success', (data: any) => {
// // //       console.log('socketlog- ride:decline:success:', JSON.stringify(data, null, 2));
// // //       sendToWebView({
// // //         type: 'RIDE_DECLINE_SUCCESS',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== LOCATION EVENTS ====================
    
// // //     DeviceSocketService.on('driver:location:updated', (data: any) => {
// // //       console.log('socketlog- driver:location:updated: Driver location update received');
// // //       sendToWebView({
// // //         type: 'DRIVER_LOCATION_UPDATED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('rider:location:updated', (data: any) => {
// // //       console.log('socketlog- rider:location:updated: Rider location update received');
// // //       sendToWebView({
// // //         type: 'RIDER_LOCATION_UPDATED',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== DRIVER AVAILABILITY EVENTS ====================
    
// // //     DeviceSocketService.on('driver:online:success', (data: any) => {
// // //       console.log('socketlog- driver:online:success:', JSON.stringify(data, null, 2));
// // //       sendToWebView({
// // //         type: 'DRIVER_ONLINE_SUCCESS',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('driver:offline:success', (data: any) => {
// // //       console.log('socketlog- driver:offline:success:', JSON.stringify(data, null, 2));
// // //       sendToWebView({
// // //         type: 'DRIVER_OFFLINE_SUCCESS',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('driver:forced:offline', async (data: any) => {
// // //       console.log('socketlog- driver:forced:offline:', JSON.stringify(data, null, 2));
      
// // //       // Show urgent notification
// // //       await NotificationService.showHighPriority({
// // //         title: 'Account Status',
// // //         body: data.message || 'You have been taken offline',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'DRIVER_FORCED_OFFLINE',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== SUBSCRIPTION EVENTS ====================
    
// // //     DeviceSocketService.on('subscription:expiring:warning', async (data: any) => {
// // //       console.log('socketlog- subscription:expiring:warning:', JSON.stringify(data, null, 2));
      
// // //       // Show warning notification
// // //       await NotificationService.show({
// // //         title: 'Subscription Expiring Soon',
// // //         body: `Your ${data.planName} plan expires in ${data.daysRemaining} days`,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'SUBSCRIPTION_EXPIRING',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('subscription:expired', async (data: any) => {
// // //       console.log('socketlog- subscription:expired:', JSON.stringify(data, null, 2));
      
// // //       // Show urgent notification
// // //       await NotificationService.showHighPriority({
// // //         title: 'Subscription Expired',
// // //         body: data.message || 'Your subscription has expired',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'SUBSCRIPTION_EXPIRED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('subscription:activated', async (data: any) => {
// // //       console.log('socketlog- subscription:activated:', JSON.stringify(data, null, 2));
      
// // //       // Show success notification
// // //       await NotificationService.show({
// // //         title: 'Subscription Activated',
// // //         body: `Your ${data.planName} plan is now active`,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'SUBSCRIPTION_ACTIVATED',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== PAYMENT EVENTS ====================
    
// // //     DeviceSocketService.on('payment:success', async (data: any) => {
// // //       console.log('socketlog- payment:success:', JSON.stringify(data, null, 2));
      
// // //       // Show success notification
// // //       await NotificationService.show({
// // //         title: 'Payment Successful',
// // //         body: `K${data.amount?.toFixed(2) || 0} - ${data.type}`,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'PAYMENT_SUCCESS',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('payment:failed', async (data: any) => {
// // //       console.log('socketlog- payment:failed:', JSON.stringify(data, null, 2));
      
// // //       // Show error notification
// // //       await NotificationService.show({
// // //         title: 'Payment Failed',
// // //         body: data.reason || 'Your payment could not be processed',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'PAYMENT_FAILED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('withdrawal:processed', async (data: any) => {
// // //       console.log('socketlog- withdrawal:processed:', JSON.stringify(data, null, 2));
      
// // //       // Show success notification
// // //       await NotificationService.show({
// // //         title: 'Withdrawal Processed',
// // //         body: `K${data.amount?.toFixed(2) || 0} via ${data.method}`,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'WITHDRAWAL_PROCESSED',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== RATING EVENTS ====================
    
// // //     DeviceSocketService.on('rating:request', async (data: any) => {
// // //       console.log('socketlog- rating:request:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Rate Your Experience',
// // //         body: `Please rate your ${data.ratingType || 'recent'} trip`,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'RATING_REQUEST',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('rating:submitted', (data: any) => {
// // //       console.log('socketlog- rating:submitted:', JSON.stringify(data, null, 2));
// // //       sendToWebView({
// // //         type: 'RATING_SUBMITTED',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== NOTIFICATION EVENTS ====================
    
// // //     DeviceSocketService.on('notification:new', async (data: any) => {
// // //       console.log('socketlog- notification:new:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show(data);
      
// // //       sendToWebView({
// // //         type: 'NOTIFICATION_NEW',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('notification:broadcast', async (data: any) => {
// // //       console.log('socketlog- notification:broadcast:', JSON.stringify(data, null, 2));
      
// // //       // Show broadcast notification
// // //       await NotificationService.show({
// // //         title: data.title || 'Announcement',
// // //         body: data.message || data.body,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'NOTIFICATION_BROADCAST',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== SOS & EMERGENCY EVENTS ====================
    
// // //     DeviceSocketService.on('sos:triggered', async (data: any) => {
// // //       console.log('socketlog- sos:triggered:', JSON.stringify(data, null, 2));
      
// // //       // Show confirmation notification
// // //       await NotificationService.showHighPriority({
// // //         title: 'SOS Alert Sent',
// // //         body: 'Emergency services have been notified',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'SOS_TRIGGERED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('sos:acknowledged', async (data: any) => {
// // //       console.log('socketlog- sos:acknowledged:', JSON.stringify(data, null, 2));
      
// // //       // Show acknowledgment notification
// // //       await NotificationService.show({
// // //         title: 'SOS Acknowledged',
// // //         body: `Your alert has been acknowledged by ${data.acknowledgedBy}`,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'SOS_ACKNOWLEDGED',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== BUS ROUTE EVENTS ====================
    
// // //     DeviceSocketService.on('bus:route:started', async (data: any) => {
// // //       console.log('socketlog- bus:route:started:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Bus Route Started',
// // //         body: 'Your bus is now on the way',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'BUS_ROUTE_STARTED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('bus:location:updated', (data: any) => {
// // //       console.log('socketlog- bus:location:updated: Bus location update received');
// // //       sendToWebView({
// // //         type: 'BUS_LOCATION_UPDATED',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== AFFILIATE EVENTS ====================
    
// // //     DeviceSocketService.on('affiliate:referral:signup', async (data: any) => {
// // //       console.log('socketlog- affiliate:referral:signup:', JSON.stringify(data, null, 2));
      
// // //       // Show success notification
// // //       await NotificationService.show({
// // //         title: 'Referral Signup',
// // //         body: `${data.referredUser} signed up! +${data.points} points`,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'AFFILIATE_REFERRAL_SIGNUP',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('affiliate:commission:earned', async (data: any) => {
// // //       console.log('socketlog- affiliate:commission:earned:', JSON.stringify(data, null, 2));
      
// // //       // Show earnings notification
// // //       await NotificationService.show({
// // //         title: 'Commission Earned',
// // //         body: `K${data.amount?.toFixed(2) || 0} commission earned`,
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'AFFILIATE_COMMISSION_EARNED',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== SYSTEM EVENTS ====================
    
// // //     DeviceSocketService.on('system:announcement', async (data: any) => {
// // //       console.log('socketlog- system:announcement:', JSON.stringify(data, null, 2));
      
// // //       // Show system announcement based on priority
// // //       if (data.priority === 'high' || data.priority === 'urgent') {
// // //         await NotificationService.showHighPriority({
// // //           title: 'Important Announcement',
// // //           body: data.message,
// // //           data,
// // //         });
// // //       } else {
// // //         await NotificationService.show({
// // //           title: 'Announcement',
// // //           body: data.message,
// // //           data,
// // //         });
// // //       }
      
// // //       sendToWebView({
// // //         type: 'SYSTEM_ANNOUNCEMENT',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== SESSION EVENTS ====================
    
// // //     DeviceSocketService.on('rider:session-replaced', async (data: any) => {
// // //       console.log('socketlog- rider:session-replaced:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Session Replaced',
// // //         body: data.message || 'You have logged in on another device',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'SESSION_REPLACED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('driver:session-replaced', async (data: any) => {
// // //       console.log('socketlog- driver:session-replaced:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Session Replaced',
// // //         body: data.message || 'You have logged in on another device',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'SESSION_REPLACED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('conductor:session-replaced', async (data: any) => {
// // //       console.log('socketlog- conductor:session-replaced:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Session Replaced',
// // //         body: data.message || 'You have logged in on another device',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'SESSION_REPLACED',
// // //         payload: data,
// // //       });
// // //     });

// // //     DeviceSocketService.on('delivery:session-replaced', async (data: any) => {
// // //       console.log('socketlog- delivery:session-replaced:', JSON.stringify(data, null, 2));
      
// // //       // Show notification
// // //       await NotificationService.show({
// // //         title: 'Session Replaced',
// // //         body: data.message || 'You have logged in on another device',
// // //         data,
// // //       });
      
// // //       sendToWebView({
// // //         type: 'SESSION_REPLACED',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== CONNECTION STATUS EVENTS ====================
    
// // //     DeviceSocketService.on('connected', () => {
// // //       console.log('socketlog- connected: Socket connection established');
// // //       logger.info('Device socket connected');
// // //       sendToWebView({ type: 'SOCKET_CONNECTED', payload: {} });
// // //     });

// // //     DeviceSocketService.on('disconnected', (data: any) => {
// // //       console.log('socketlog- disconnected:', JSON.stringify(data, null, 2));
// // //       logger.warn('Device socket disconnected:', data.reason);
// // //       sendToWebView({
// // //         type: 'SOCKET_DISCONNECTED',
// // //         payload: data,
// // //       });
// // //     });

// // //     // ==================== ERROR EVENTS ====================
    
// // //     DeviceSocketService.on('socket_error', (data: any) => {
// // //       console.log('socketlog- socket_error:', JSON.stringify(data, null, 2));
// // //       logger.error('Socket error received:', data);
// // //       sendToWebView({
// // //         type: 'SOCKET_ERROR',
// // //         payload: data,
// // //       });
// // //     });

// // //     logger.info('✅ All socket event listeners registered');
// // //   }, [sendToWebView]);

// // //   // Handle messages from WebView
// // //   const onMessage = async (event: any) => {
// // //     try {
// // //       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
// // //       const { type, requestId, payload } = message;

// // //       logger.info(`Received message from WebView: ${type}${requestId ? ` (requestId: ${requestId})` : ''}`);

// // //       let response: any = null;

// // //       switch (type) {
// // //         case 'INITIALIZE_SERVICES':
// // //           response = await handleInitializeServices(payload);
// // //           break;
// // //         case 'LOG_DATA':
// // //           response = await handleLogDataFromWebView(payload);
// // //           break;

// // //         case 'REQUEST_PERMISSION':
// // //           response = await handleRequestPermission(payload);
// // //           break;

// // //         case 'CHECK_PERMISSION':
// // //           response = await handleCheckPermission(payload);
// // //           break;

// // //         case 'GET_CURRENT_LOCATION':
// // //           response = await handleGetCurrentLocation();
// // //           break;

// // //         case 'START_LOCATION_TRACKING':
// // //           response = await handleStartLocationTracking(payload);
// // //           break;

// // //         case 'STOP_LOCATION_TRACKING':
// // //           response = await handleStopLocationTracking();
// // //           break;

// // //         case 'SHOW_NOTIFICATION':
// // //           response = await handleShowNotification(payload);
// // //           break;

// // //         case 'PLAY_AUDIO':
// // //           response = await handlePlayAudio(payload);
// // //           break;

// // //         case 'GO_ONLINE':
// // //           response = await handleGoOnline(payload);
// // //           break;

// // //         case 'GO_OFFLINE':
// // //           response = await handleGoOffline(payload);
// // //           break;

// // //         default:
// // //           logger.warn(`Unknown message type: ${type}`);
// // //           response = { error: 'Unknown message type' };
// // //       }

// // //       // Send response back to WebView if requestId provided
// // //       if (requestId) {
// // //         const messageToSend = {
// // //           type: type,
// // //           requestId,
// // //           payload: response?.error ? null : response,
// // //           error: response?.error || undefined
// // //         };
        
// // //         logger.info(`Sending response back to WebView for ${type}`, messageToSend);
        
// // //         if (webViewRef.current) {
// // //           webViewRef.current.postMessage(JSON.stringify(messageToSend));
// // //         }
// // //       }
// // //     } catch (error: any) {
// // //       logger.error('Error handling WebView message:', error);

// // //       // Send error response
// // //       try {
// // //         const { requestId, type } = JSON.parse(event.nativeEvent.data);
// // //         if (requestId && webViewRef.current) {
// // //           webViewRef.current.postMessage(JSON.stringify({
// // //             type: type,
// // //             requestId,
// // //             payload: null,
// // //             error: error.message
// // //           }));
// // //         }
// // //       } catch {}
// // //     }
// // //   };

// // //   // Initialize Services (called after user authentication)
// // //   const handleInitializeServices = async (payload: any) => {
// // //     try {
// // //       const { userId, frontendName, socketServerUrl } = payload;

// // //       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

// // //       if (servicesInitialized) {
// // //         logger.warn('Services already initialized');
// // //         return { success: true, reason: 'already_initialized' };
// // //       }

// // //       // Generate device ID
// // //       const deviceInfo = await getDeviceInfo();
// // //       const deviceId = deviceInfo.deviceId;
// // //       deviceIdRef.current = deviceId;
// // //       userIdRef.current = userId;
// // //       frontendNameRef.current = frontendName;
// // //       // Set device ID in LocationService
// // //       LocationService.setDeviceId(deviceId);

// // //       // 1. Request critical permissions first
// // //       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

// // //       if (!permissionsGranted.location) {
// // //         logger.error('Location permission denied - cannot initialize');
// // //         return {
// // //           success: false,
// // //           error: 'Location permission required',
// // //           permissions: permissionsGranted,
// // //         };
// // //       }

// // //       // 2. Start background services
// // //       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
// // //       const servicesStarted = await BackgroundService.start({
// // //         deviceId,
// // //         userId,
// // //         frontendName,
// // //         socketServerUrl: socketUrl,
// // //       });

// // //       if (!servicesStarted) {
// // //         logger.error('Failed to start background services');
// // //         return {
// // //           success: false,
// // //           error: 'Failed to start services',
// // //         };
// // //       }

// // //       // 3. Setup socket event listeners
// // //       setupSocketListeners(deviceId, frontendName);

// // //       setServicesInitialized(true);
// // //       logger.info('✅ Services initialized successfully');

// // //       return {
// // //         success: true,
// // //         deviceId,
// // //         permissions: permissionsGranted,
// // //         socketConnected: DeviceSocketService.isConnected(),
// // //       };
// // //     } catch (error: any) {
// // //       logger.error('Error initializing services:', error);
// // //       return { success: false, error: error.message };
// // //     }
// // //   };

// // //   // Request Permission
// // //   const handleRequestPermission = async (payload: any) => {
// // //     const { permissionType } = payload;
// // //     logger.info(`Requesting permission: ${permissionType}`);

// // //     try {
// // //       const status = await PermissionManager.request(permissionType);
// // //       return { status };
// // //     } catch (error: any) {
// // //       logger.error(`Error requesting ${permissionType}:`, error);
// // //       return { status: 'denied', error: error.message };
// // //     }
// // //   };

// // //   // Check Permission
// // //   const handleCheckPermission = async (payload: any) => {
// // //     const { permissionType } = payload;
// // //     const status = await PermissionManager.check(permissionType);
// // //     return { status };
// // //   };

// // //   // Log from WebView
// // //   const handleLogDataFromWebView = async (payload: any) => {
// // //     console.log('Log from webview', payload);
// // //     return { success: true };
// // //   };

// // //   // Get Current Location
// // //   const handleGetCurrentLocation = async () => {
// // //     try {
// // //       logger.info('Getting current location...');
// // //       const location = await LocationService.getCurrentLocation();
      
// // //       if (!location) {
// // //         logger.warn('Could not get location');
// // //         return { error: 'Could not get location' };
// // //       }

// // //       return location;
// // //     } catch (error: any) {
// // //       logger.error('Error getting location:', error);
// // //       return { error: error.message };
// // //     }
// // //   };

// // //   // Start Location Tracking
// // //   const handleStartLocationTracking = async (payload: any) => {
// // //     try {
// // //       if (!deviceIdRef.current) {
// // //         throw new Error('Device not initialized');
// // //       }

// // //       const success = await LocationService.startPersistentTracking(deviceIdRef.current);
      
// // //       if (success) {
// // //         logger.info('Location tracking started successfully');
// // //       }
      
// // //       return { success };
// // //     } catch (error: any) {
// // //       logger.error('Error starting location tracking:', error);
// // //       return { success: false, error: error.message };
// // //     }
// // //   };

// // //   // Stop Location Tracking
// // //   const handleStopLocationTracking = async () => {
// // //     try {
// // //       await LocationService.stopPersistentTracking();
// // //       logger.info('Location tracking stopped successfully');
// // //       return { success: true };
// // //     } catch (error: any) {
// // //       logger.error('Error stopping location tracking:', error);
// // //       return { success: false, error: error.message };
// // //     }
// // //   };

// // //   // Show Notification
// // //   const handleShowNotification = async (payload: any) => {
// // //     try {
// // //       await NotificationService.show(payload);
// // //       return { success: true };
// // //     } catch (error: any) {
// // //       return { success: false, error: error.message };
// // //     }
// // //   };

// // //   // Play Audio
// // //   const handlePlayAudio = async (payload: any) => {
// // //     const { soundFile } = payload;
// // //     try {
// // //       await AudioService.playAlert(soundFile);
// // //       return { success: true };
// // //     } catch (error: any) {
// // //       return { success: false, error: error.message };
// // //     }
// // //   };

// // //   // Go Online (Driver)
// // //   const handleGoOnline = async (payload: any) => {
// // //     try {
// // //       const location = await LocationService.getCurrentLocation();

// // //       if (!location) {
// // //         throw new Error('Cannot get current location');
// // //       }

// // //       // Emit driver:online event to socket
// // //       await DeviceSocketService.emit('driver:online', {
// // //         driverId: userIdRef.current,
// // //         location: {
// // //           lat: location.coords.latitude,
// // //           lng: location.coords.longitude,
// // //         },
// // //       });

// // //       // Start location tracking when going online
// // //       if (deviceIdRef.current) {
// // //         const trackingStarted = await LocationService.startPersistentTracking(deviceIdRef.current);
// // //         if (trackingStarted) {
// // //           isOnlineRef.current = true;
// // //           logger.info('Location tracking started when going online');
// // //         } else {
// // //           logger.warn('Failed to start location tracking when going online');
// // //         }
// // //       }

// // //       return {
// // //         success: true,
// // //         location: {
// // //           lat: location.coords.latitude,
// // //           lng: location.coords.longitude,
// // //         },
// // //       };
// // //     } catch (error: any) {
// // //       logger.error('Error going online:', error);
// // //       return { success: false, error: error.message };
// // //     }
// // //   };

// // //   // Go Offline (Driver)
// // //   const handleGoOffline = async (payload: any) => {
// // //     try {
// // //       // Emit driver:offline event to socket
// // //       await DeviceSocketService.emit('driver:offline', {
// // //         driverId: userIdRef.current,
// // //       });

// // //       // Stop location tracking when going offline
// // //       if (isOnlineRef.current) {
// // //         await LocationService.stopPersistentTracking();
// // //         isOnlineRef.current = false;
// // //         logger.info('Location tracking stopped when going offline');
// // //       }

// // //       return { success: true };
// // //     } catch (error: any) {
// // //       logger.error('Error going offline:', error);
// // //       return { success: false, error: error.message };
// // //     }
// // //   };

// // //   // WebView error handler
// // //   const handleWebViewError = (syntheticEvent: any) => {
// // //     const { nativeEvent } = syntheticEvent;
// // //     logger.error('WebView error:', nativeEvent);
// // //     setHasError(true);
// // //   };

// // //   // WebView load end handler
// // //   const handleLoadEnd = () => {
// // //     logger.info('loading ended');
// // //     setIsLoading(false);
// // //   };

// // //   // Render error state
// // //   if (hasError) {
// // //     return (
// // //       <View style={styles.errorContainer}>
// // //         <Text style={styles.errorTitle}>😔 Oops!</Text>
// // //         <Text style={styles.errorText}>
// // //           Something went wrong loading the app.
// // //         </Text>
// // //         <Text style={styles.errorSubtext}>
// // //           Please check your internet connection and try again.
// // //         </Text>
// // //       </View>
// // //     );
// // //   }

// // //   // Render offline state
// // //   if (!isConnected) {
// // //     return (
// // //       <View style={styles.offlineContainer}>
// // //         <Text style={styles.offlineTitle}>📡 No Connection</Text>
// // //         <Text style={styles.offlineText}>
// // //           You're currently offline. Please check your internet connection.
// // //         </Text>
// // //       </View>
// // //     );
// // //   }

// // //   return (
// // //     <SafeAreaView style={styles.container}>
// // //       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
// // //       <WebView
// // //         ref={webViewRef}
// // //         source={{ uri: FRONTEND_URL }}
// // //         onMessage={onMessage}
// // //         javaScriptEnabled={true}
// // //         domStorageEnabled={true}
// // //         geolocationEnabled={true}
// // //         startInLoadingState={true}
// // //         originWhitelist={['*']} // Allows navigation to all frontends
// // //         allowsInlineMediaPlayback={true}
// // //         mediaPlaybackRequiresUserAction={false}
// // //         style={styles.webview}
// // //         onError={handleWebViewError}
// // //         onLoadEnd={handleLoadEnd}
// // //         onHttpError={(syntheticEvent) => {
// // //           const { nativeEvent } = syntheticEvent;
// // //           logger.error('WebView HTTP error:', nativeEvent.statusCode);
// // //         }}
// // //         // Performance optimizations
// // //         cacheEnabled={true}
// // //         cacheMode="LOAD_DEFAULT"
// // //         mixedContentMode="always"
// // //         // Security
// // //         allowFileAccess={false}
// // //         allowUniversalAccessFromFileURLs={false}
// // //       />
// // //       {/* Ride Request Modal */}
// // //     <RideRequestModal
// // //       open={showRideRequestModal}
// // //       rideRequest={currentRideRequest}
// // //       onAccept={handleAcceptRide}
// // //       onDecline={handleDeclineRide}
// // //     />
// // //     </SafeAreaView>
// // //   );
// // // }

// // // const styles = StyleSheet.create({
// // //   container: {
// // //     flex: 1,
// // //     backgroundColor: '#FFFFFF',
// // //   },
// // //   webview: {
// // //     flex: 1,
// // //   },
// // //   loadingContainer: {
// // //     flex: 1,
// // //     justifyContent: 'center',
// // //     alignItems: 'center',
// // //     backgroundColor: '#FFFFFF',
// // //   },
// // //   loadingText: {
// // //     marginTop: 16,
// // //     fontSize: 16,
// // //     color: '#666666',
// // //   },
// // //   errorContainer: {
// // //     flex: 1,
// // //     justifyContent: 'center',
// // //     alignItems: 'center',
// // //     backgroundColor: '#FFFFFF',
// // //     padding: 24,
// // //   },
// // //   errorTitle: {
// // //     fontSize: 48,
// // //     marginBottom: 16,
// // //   },
// // //   errorText: {
// // //     fontSize: 18,
// // //     fontWeight: '600',
// // //     color: '#1A1A1A',
// // //     textAlign: 'center',
// // //     marginBottom: 8,
// // //   },
// // //   errorSubtext: {
// // //     fontSize: 14,
// // //     color: '#666666',
// // //     textAlign: 'center',
// // //   },
// // //   offlineContainer: {
// // //     flex: 1,
// // //     justifyContent: 'center',
// // //     alignItems: 'center',
// // //     backgroundColor: '#FFFFFF',
// // //     padding: 24,
// // //   },
// // //   offlineTitle: {
// // //     fontSize: 48,
// // //     marginBottom: 16,
// // //   },
// // //   offlineText: {
// // //     fontSize: 16,
// // //     color: '#666666',
// // //     textAlign: 'center',
// // //   },
// // // });
// // //OkraApp/App.tsx (Complete with Socket Event Listeners)
// // import React, { useRef, useEffect, useState, useCallback } from 'react';
// // import {
// //   StatusBar,
// //   Platform,
// //   AppState,
// //   StyleSheet,
// //   View,
// //   Text,
// //   ActivityIndicator,
// // } from 'react-native';
// // import { SafeAreaView } from 'react-native-safe-area-context';
// // import { WebView } from 'react-native-webview';
// // import * as Notifications from 'expo-notifications';
// // import * as TaskManager from 'expo-task-manager';
// // import NetInfo from '@react-native-community/netinfo';

// // import BackgroundService from './src/services/BackgroundService';
// // import DeviceSocketService from './src/services/DeviceSocketService';
// // import LocationService from './src/services/LocationService';
// // import NotificationService from './src/services/NotificationService';
// // import PermissionManager from './src/services/PermissionManager';
// // import AudioService from './src/services/AudioService';
// // import DeepLinkService from './src/services/DeepLinkService';
// // import { getDeviceInfo } from './src/utils/device-info';
// // import { logger } from './src/utils/logger';
// // import { NavigationHelper } from './src/utils/navigation';
// // import { SOCKET_EVENTS, WEBVIEW_EVENTS, CONSTANTS } from './src/utils/constants';
// // import type { WebViewMessage } from './src/types/messages';
// // import OkraSkeletonLoader from '@components/OkraSkeletonLoader';
// // import { RideRequestModal } from './src/components/RideRequestModal';
// // // Define background notification task
// // TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
// //   if (error) {
// //     logger.error('Background notification task error:', error);
// //     return;
// //   }

// //   if (data) {
// //     await NotificationService.handleBackgroundNotification(data);
// //   }
// // });

// // const API_URL = CONSTANTS.BACKEND_URL
// // const FRONTEND_URL = __DEV__
// //   ? Platform.OS === 'android'
// //     ? 'http://10.64.246.23:3000/' // Android emulator
// //     : 'http://10.64.246.23:3000' // iOS simulator
// //   : CONSTANTS.FRONTEND_URLS.landing;

// //   // helper function to get frontend URLs
// // const getFrontendUrls = async () => {
// //   try {
// //     const response = await fetch(`${API_URL}/frontend-url`);
// //     if (!response.ok) {
// //       throw new Error('Failed to fetch URLs');
// //     }
// //     const res = await response.json();
// //     return res?.data?.paths || {};
// //   } catch (error) {
// //     logger.error('Error fetching frontend URLs:', error);
// //     return {};
// //   }
// // }

// // export default function App() {
// //   const webViewRef = useRef<WebView>(null);
// //   const [appState, setAppState] = useState(AppState.currentState);
// //   const [servicesInitialized, setServicesInitialized] = useState(false);
// //   const [isLoading, setIsLoading] = useState(true);
// //   const [hasError, setHasError] = useState(false);
// //   const [isConnected, setIsConnected] = useState(true);
  
// //   const deviceIdRef = useRef<string | null>(null);
// //   const userIdRef = useRef<string | number | null>(null);
// //   const frontendNameRef = useRef<string | null>(null);
// //   const isOnlineRef = useRef<boolean>(false); // Track online/offline state
// //   const [showRideRequestModal, setShowRideRequestModal] = useState(false);
// //   const [currentRideRequest, setCurrentRideRequest] = useState<any>(null);

// //   // Send message to WebView
// //   const sendToWebView = useCallback((data: any) => {
// //     if (!webViewRef.current) {
// //       logger.warn('Cannot send to WebView: ref is null');
// //       return;
// //     }

// //     NavigationHelper.sendMessage(webViewRef, data.type, data.payload);
// //   }, []);

// //     // Add these handler functions (add before setupSocketListeners)
// // const handleAcceptRide = async (rideId: string) => {
// //   logger.info('Accepting ride:', rideId);
  
// //   if (!currentRideRequest) {
// //     logger.error('No current ride request data');
// //     return;
// //   }
  
// //   setShowRideRequestModal(false);
  
// //   try {
// //     setIsLoading(true);
    
// //     // Call the accept ride API endpoint
// //     const { deviceId } = await getDeviceInfo();
// //     const response = await fetch(`${API_URL}/devices/acceptride/${deviceId}`, {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //         // Add authorization if needed
// //         // 'Authorization': `Bearer ${token}`,
// //       },
// //     });

// //     if (!response.ok) {
// //       throw new Error('Failed to accept ride');
// //     }

// //     const result = await response.json();
// //     logger.info('Ride accepted successfully:', result);

// //     // Emit socket event for real-time updates
// //     await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.ACCEPTED, { rideId });

// //     // Get frontend URLs
// //     const urls = await getFrontendUrls();
    
// //     // Determine the correct URL based on userType from the request data
// //     let targetUrl = '';
// //     const userType = currentRideRequest.userType;
    
// //     if (userType === 'driver') {
// //       targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
// //     } else if (userType === 'delivery') {
// //       targetUrl = urls['okra-delivery-app'] || 'http://10.64.246.23:3003';
// //     } else if (userType === 'conductor') {
// //       targetUrl = urls['okra-conductor-app'] || 'http://10.64.246.23:3004';
// //     } else {
// //       logger.warn(`Unknown userType: ${userType}, defaulting to driver app`);
// //       targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
// //     }
    
// //     // Navigate to active ride page
// //     if (webViewRef.current) {
// //        webViewRef.current.injectJavaScript(`
// //         window.location.href = "${targetUrl}/active-ride/${rideId}";
// //       `)
// //     }
    
// //     logger.info(`Navigating ${userType} to: ${targetUrl}/active-ride/${rideId}`);
    
// //     // Clear the current request
// //     setCurrentRideRequest(null);
    
// //   } catch (error) {
// //     logger.error('Error accepting ride:', error);
    
// //     // Show error to user
// //     setShowRideRequestModal(true); // Show modal again
    
// //     // Optionally show an alert
// //     if (webViewRef.current) {
// //       webViewRef.current.injectJavaScript(`
// //         alert('Failed to accept ride. Please try again.');
// //       `);
// //     }
// //   } finally {
// //     setIsLoading(false);
// //   }
// // };

// // const handleDeclineRide = async (rideId: string) => {
// //   logger.info('Declining ride:', rideId);
  
// //   if (!currentRideRequest) {
// //     logger.error('No current ride request data');
// //     return;
// //   }
  
// //   setShowRideRequestModal(false);
  
// //   try {
// //     setIsLoading(true);
    
// //     // Call the decline ride API endpoint
// //     const response = await fetch(`${API_URL}/rides/${rideId}/decline`, {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //         // Add authorization if needed
// //         // 'Authorization': `Bearer ${token}`,
// //       },
// //       body: JSON.stringify({
// //         reason: 'Driver declined',
// //       }),
// //     });

// //     if (!response.ok) {
// //       throw new Error('Failed to decline ride');
// //     }

// //     const result = await response.json();
// //     logger.info('Ride declined successfully:', result);

// //     // Emit socket event for real-time updates
// //     await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.DECLINE, { 
// //       rideId, 
// //       reason: 'Driver declined' 
// //     });
    
// //     logger.info(`Ride declined by ${currentRideRequest.userType}`);
    
// //     // Clear the current request
// //     setCurrentRideRequest(null);
    
// //   } catch (error) {
// //     logger.error('Error declining ride:', error);
    
// //     // Still clear the request even if API fails
// //     setCurrentRideRequest(null);
// //   } finally {
// //     setIsLoading(false);
// //   }
// // };

// //   // Initialize notification service on mount
// //   useEffect(() => {
// //     const initNotifications = async () => {
// //       await NotificationService.initialize(sendToWebView);
// //     };

// //     initNotifications();

// //     return () => {
// //       NotificationService.cleanup();
// //     };
// //   }, [sendToWebView]);

// //   // Monitor network connectivity
// //   useEffect(() => {
// //     const handleActiveRide = async ()=>{
// //       //socketlog
// //           const { deviceId } = await getDeviceInfo();
// //           console.log('rides API_URL',API_URL)
// //           const rideResponse = await fetch(`${API_URL}/devices/activeride/${deviceId}`);
// //           console.log("Response received:", rideResponse.status);
// //           if (!rideResponse.ok) {
// //             throw new Error('Failed to fetch URLs')
// //           }
// //           const rideRes = await rideResponse.json();
// //           console.log('rides-ridesResponse',rideRes)
// //           if(rideRes.data){
// //             const urls = await getFrontendUrls();
// //              if(typeof window !== "undefined" && rideRes?.success){
// //               const ride = rideRes?.data // get actual active ride itself
// //               if(rideRes.userRole === "rider"){
// //                   if (ride.rideStatus === 'pending') {
// //                     webViewRef.current?.injectJavaScript(`
// //                         window.location.href = "${urls['okra-rider-app']}/finding-driver?rideId=${ride.id}";
// //                     `)
// //                   } else if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// //                     webViewRef.current?.injectJavaScript(`
// //                         window.location.href = "${urls['okra-rider-app']}/tracking?rideId=${ride.id}";
// //                     `)
// //                   }
// //               }
// //               else if(rideRes.userRole === "driver"){
// //                   if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// //                       webViewRef.current?.injectJavaScript(`
// //                         window.location.href = "${urls['okra-driver-app']}/active-ride/${ride.id}";
// //                       `)
// //                   }
// //               }
// //               else if(rideRes.userRole === "delivery"){
// //                   if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// //                       webViewRef.current?.injectJavaScript(`
// //                         window.location.href = "${urls['okra-delivery-app']}/active-ride/${ride.id}";
// //                       `)
// //                   }
// //               }
// //               else if(rideRes.userRole === "conductor"){
// //                   if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// //                       webViewRef.current?.injectJavaScript(`
// //                         window.location.href = "${urls['okra-conductor-app']}/active-ride/${ride.id}";
// //                       `)
// //                   }
// //               }
// //              }
// //           }
// //     }
// //     handleActiveRide()
// //     const unsubscribe = NetInfo.addEventListener(state => {
// //       setIsConnected(state.isConnected ?? false);
      
// //       if (state.isConnected && servicesInitialized) {
// //         // Reconnect socket if disconnected
// //         if (!DeviceSocketService.isConnected()) {
// //           logger.info('Network restored, reconnecting socket...');
// //           DeviceSocketService.reconnect();
// //         }
// //       }
// //     });

// //     return () => unsubscribe();
// //   }, [servicesInitialized]);
 
// //   // Handle App State Changes
// //   useEffect(() => {
// //     const subscription = AppState.addEventListener('change', async (nextAppState) => {
// //       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

// //       if (appState.match(/inactive|background/) && nextAppState === 'active') {
// //         // App came to foreground
// //         logger.info('App resumed to foreground');

// //         // Check socket connection health
// //         if (servicesInitialized && !DeviceSocketService.isConnected()) {
// //           logger.warn('Socket disconnected, attempting reconnect');
// //           await DeviceSocketService.reconnect();
// //         }

// //         // Notify WebView
// //         sendToWebView({ type: WEBVIEW_EVENTS.APP_RESUMED, payload: {} });
// //       } else if (nextAppState === 'background') {
// //         logger.info('App moved to background');
        
// //         // Ensure background service is running (Android)
// //         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
// //           await BackgroundService.ensureForegroundService();
// //         }
// //       }

// //       setAppState(nextAppState);
// //     });

// //     return () => subscription.remove();
// //   }, [appState, servicesInitialized, sendToWebView]);


// //   // Setup Socket Listeners (called after initialization)
// //   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
// //     logger.info(`Setting up socket listeners for ${frontendName}`);

// //     // ==================== CORE DEVICE EVENTS ====================
    
// //     // Listen for location requests from backend
// //     DeviceSocketService.on(SOCKET_EVENTS.CONNECTION.GET_CURRENT_LOCATION, async () => {
// //       console.log('socketlog- getCurrentLocation: Backend requested current location');
// //       logger.info('Received location request from backend via socket');
// //       try {
// //         const location = await LocationService.getCurrentLocation();
// //         if (location) {
// //           sendToWebView({
// //             type: WEBVIEW_EVENTS.LOCATION_UPDATE,
// //             payload: {
// //               lat: location.coords.latitude,
// //               lng: location.coords.longitude,
// //               accuracy: location.coords.accuracy,
// //               heading: location.coords.heading,
// //               speed: location.coords.speed,
// //             },
// //           });
// //         }
// //       } catch (error) {
// //         logger.error('Error getting location on request:', error);
// //       }
// //     });

// //     // Listen for notifications
// //     DeviceSocketService.on('showNotification', async (notification: any) => {
// //       console.log('socketlog- showNotification:', JSON.stringify(notification, null, 2));
// //       logger.info('Received notification request:', notification.type);
// //       await NotificationService.show(notification);

// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.NOTIFICATION_RECEIVED,
// //         payload: notification,
// //       });
// //     });

// //     // Listen for draw-over requests (Android only, non-rider)
// //     if (Platform.OS === 'android' && frontendName !== 'rider') {
// //       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
// //         console.log('socketlog- showDrawOver:', JSON.stringify(overlayData, null, 2));
// //         logger.info('Received draw-over request');

// //         if (overlayData.shouldDrawOver === false) {
// //           logger.info('shouldDrawOver is false, skipping overlay');
          
// //           await NotificationService.showHighPriority({
// //             title: 'New Ride Request',
// //             body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// //             data: overlayData,
// //           });
          
// //           sendToWebView({
// //             type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW,
// //             payload: overlayData,
// //           });
          
// //           return;
// //         }

// //         await AudioService.playAlert("ride_request");

// //         const hasPermission = await PermissionManager.checkDrawOverPermission();
// //         if (hasPermission) {
// //           await BackgroundService.showDrawOver(overlayData);
// //         }

// //         await NotificationService.showHighPriority({
// //           title: 'New Ride Request',
// //           body: `${overlayData.distance?.toFixed(1) || 0}km away • K${overlayData.estimatedFare?.toFixed(2) || 0}`,
// //           data: overlayData,
// //         });

// //         sendToWebView({
// //           type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW,
// //           payload: overlayData,
// //         });
// //       });
// //     }

// //     // ==================== RIDE LIFECYCLE EVENTS (RIDER-FOCUSED) ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_CREATED, (data: any) => {
// //       console.log('socketlog- ride:request:created:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_REQUEST_CREATED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_NEW, async (data: any) => {
// //       console.log('socketlog- ride:request:new:', JSON.stringify(data, null, 2));
      
// //       await AudioService.playAlert('ride_request');
      
// //       setCurrentRideRequest(data);
// //       setShowRideRequestModal(true);
      
// //       await NotificationService.showHighPriority({
// //         title: 'New Ride Request',
// //         body: `${data.distance?.toFixed(1) || 0}km away • K${data.estimatedFare?.toFixed(2) || 0}`,
// //         data,
// //       });
      
// //       const hasPermission = await PermissionManager.checkDrawOverPermission();
// //       if (hasPermission) {
// //         await BackgroundService.showDrawOver(data);
// //       }
// //       console.log('draw over data',data)

// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_RECEIVED, async (data: any) => {
// //       console.log('socketlog- ride:request:received:', data);
      
// //       await AudioService.playAlert('ride_request');
      
// //       setCurrentRideRequest(data);
// //       setShowRideRequestModal(true);
      
// //       await NotificationService.showHighPriority({
// //         title: 'New Ride Request',
// //         body: `${data.distance?.toFixed(1) || 0}km away • K${data.estimatedFare?.toFixed(2) || 0}`,
// //         data,
// //       });  
      
// //       const hasPermission = await PermissionManager.checkDrawOverPermission();
// //       if (hasPermission) {
// //         console.log('draw over data',data)
// //         await BackgroundService.showDrawOver(data);
// //       }

// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_REQUEST_RECEIVED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPTED, async (data: any) => {
// //       console.log('socketlog- ride:accepted:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Ride Accepted',
// //         body: 'Your driver has accepted the ride request',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_ACCEPTED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TAKEN, (data: any) => {
// //       console.log('socketlog- ride:taken:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_TAKEN,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ARRIVED, async (data: any) => {
// //       console.log('socketlog- ride:driver:arrived:', JSON.stringify(data, null, 2));
      
// //       await AudioService.playAlert('driver_arrived');
      
// //       await NotificationService.showHighPriority({
// //         title: 'Driver Arrived',
// //         body: 'Your driver is waiting for you',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_ARRIVED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_STARTED, async (data: any) => {
// //       console.log('socketlog- ride:trip:started:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Trip Started',
// //         body: 'Your trip has begun. Safe travels!',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.TRIP_STARTED,
// //         payload: data,
// //       });
// //     })

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_COMPLETED, async (data: any) => {
// //       console.log('socketlog- ride:trip:completed:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Trip Completed',
// //         body: `Fare: K${data.finalFare?.toFixed(2) || 0}`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.TRIP_COMPLETED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.CANCELLED, async (data: any) => {
// //       console.log('socketlog- ride:cancelled:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Ride Cancelled',
// //         body: data.reason || 'The ride has been cancelled',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_CANCELLED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPT_SUCCESS, (data: any) => {
// //       console.log('socketlog- ride:accept:success:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_ACCEPT_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.DECLINE_SUCCESS, (data: any) => {
// //       console.log('socketlog- ride:decline:success:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_DECLINE_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     // ==================== LOCATION EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.LOCATION_UPDATED, (data: any) => {
// //       console.log('socketlog- driver:location:updated: Driver location update received');
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_LOCATION_UPDATED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDER.LOCATION_UPDATED, (data: any) => {
// //       console.log('socketlog- rider:location:updated: Rider location update received');
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDER_LOCATION_UPDATED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== DRIVER AVAILABILITY EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ONLINE_SUCCESS, (data: any) => {
// //       console.log('socketlog- driver:online:success:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_ONLINE_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.OFFLINE_SUCCESS, (data: any) => {
// //       console.log('socketlog- driver:offline:success:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_OFFLINE_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.FORCED_OFFLINE, async (data: any) => {
// //       console.log('socketlog- driver:forced:offline:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.showHighPriority({
// //         title: 'Account Status',
// //         body: data.message || 'You have been taken offline',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_FORCED_OFFLINE,
// //         payload: data,
// //       });
// //     });

// //     // ==================== SUBSCRIPTION EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRING_WARNING, async (data: any) => {
// //       console.log('socketlog- subscription:expiring:warning:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Subscription Expiring Soon',
// //         body: `Your ${data.planName} plan expires in ${data.daysRemaining} days`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRING,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRED, async (data: any) => {
// //       console.log('socketlog- subscription:expired:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.showHighPriority({
// //         title: 'Subscription Expired',
// //         body: data.message || 'Your subscription has expired',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.ACTIVATED, async (data: any) => {
// //       console.log('socketlog- subscription:activated:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Subscription Activated',
// //         body: `Your ${data.planName} plan is now active`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SUBSCRIPTION_ACTIVATED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== PAYMENT EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.SUCCESS, async (data: any) => {
// //       console.log('socketlog- payment:success:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Payment Successful',
// //         body: `K${data.amount?.toFixed(2) || 0} - ${data.type}`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.PAYMENT_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.FAILED, async (data: any) => {
// //       console.log('socketlog- payment:failed:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Payment Failed',
// //         body: data.reason || 'Your payment could not be processed',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.PAYMENT_FAILED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.WITHDRAWAL.PROCESSED, async (data: any) => {
// //       console.log('socketlog- withdrawal:processed:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Withdrawal Processed',
// //         body: `K${data.amount?.toFixed(2) || 0} via ${data.method}`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.WITHDRAWAL_PROCESSED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== RATING EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.RATING.REQUEST, async (data: any) => {
// //       console.log('socketlog- rating:request:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Rate Your Experience',
// //         body: `Please rate your ${data.ratingType || 'recent'} trip`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RATING_REQUEST,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RATING.SUBMITTED, (data: any) => {
// //       console.log('socketlog- rating:submitted:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RATING_SUBMITTED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== NOTIFICATION EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.NEW, async (data: any) => {
// //       console.log('socketlog- notification:new:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show(data);
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.NOTIFICATION_NEW,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.BROADCAST, async (data: any) => {
// //       console.log('socketlog- notification:broadcast:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: data.title || 'Announcement',
// //         body: data.message || data.body,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.NOTIFICATION_BROADCAST,
// //         payload: data,
// //       });
// //     });

// //     // ==================== SOS & EMERGENCY EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.SOS.TRIGGERED, async (data: any) => {
// //       console.log('socketlog- sos:triggered:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.showHighPriority({
// //         title: 'SOS Alert Sent',
// //         body: 'Emergency services have been notified',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SOS_TRIGGERED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.SOS.ACKNOWLEDGED, async (data: any) => {
// //       console.log('socketlog- sos:acknowledged:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'SOS Acknowledged',
// //         body: `Your alert has been acknowledged by ${data.acknowledgedBy}`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SOS_ACKNOWLEDGED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== AFFILIATE EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.REFERRAL_SIGNUP, async (data: any) => {
// //       console.log('socketlog- affiliate:referral:signup:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Referral Signup',
// //         body: `${data.referredUser} signed up! +${data.points} points`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.AFFILIATE_REFERRAL_SIGNUP,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.COMMISSION_EARNED, async (data: any) => {
// //       console.log('socketlog- affiliate:commission:earned:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Commission Earned',
// //         body: `K${data.amount?.toFixed(2) || 0} commission earned`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.AFFILIATE_COMMISSION_EARNED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== SYSTEM EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.SYSTEM.ANNOUNCEMENT, async (data: any) => {
// //       console.log('socketlog- system:announcement:', JSON.stringify(data, null, 2));
      
// //       if (data.priority === 'high' || data.priority === 'urgent') {
// //         await NotificationService.showHighPriority({
// //           title: 'Important Announcement',
// //           body: data.message,
// //           data,
// //         });
// //       } else {
// //         await NotificationService.show({
// //           title: 'Announcement',
// //           body: data.message,
// //           data,
// //         });
// //       }
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SYSTEM_ANNOUNCEMENT,
// //         payload: data,
// //       });
// //     });

// //     // ==================== SESSION EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.RIDER.SESSION_REPLACED, async (data: any) => {
// //       console.log('socketlog- rider:session-replaced:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Session Replaced',
// //         body: data.message || 'You have logged in on another device',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SESSION_REPLACED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.SESSION_REPLACED, async (data: any) => {
// //       console.log('socketlog- driver:session-replaced:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Session Replaced',
// //         body: data.message || 'You have logged in on another device',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SESSION_REPLACED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== CONNECTION STATUS EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.CONNECTED, () => {
// //       console.log('socketlog- connected: Socket connection established');
// //       logger.info('Device socket connected');
// //       sendToWebView({ type: WEBVIEW_EVENTS.SOCKET_CONNECTED, payload: {} });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DISCONNECTED, (data: any) => {
// //       console.log('socketlog- disconnected:', JSON.stringify(data, null, 2));
// //       logger.warn('Device socket disconnected:', data.reason);
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SOCKET_DISCONNECTED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== ERROR EVENTS ====================
    
// //     DeviceSocketService.on('socket_error', (data: any) => {
// //       console.log('socketlog- socket_error:', JSON.stringify(data, null, 2));
// //       logger.error('Socket error received:', data);
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SOCKET_ERROR,
// //         payload: data,
// //       });
// //     });

// //     logger.info('✅ All socket event listeners registered');
// //   }, [sendToWebView]);

// //   // Handle messages from WebView
// //   const onMessage = async (event: any) => {
// //     try {
// //       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
// //       const { type, requestId, payload } = message;

// //       logger.info(`Received message from WebView: ${type}${requestId ? ` (requestId: ${requestId})` : ''}`);

// //       let response: any = null;

// //       switch (type) {
// //         case 'INITIALIZE_SERVICES':
// //           response = await handleInitializeServices(payload);
// //           break;
// //         case 'LOG_DATA':
// //           response = await handleLogDataFromWebView(payload);
// //           break;

// //         case 'REQUEST_PERMISSION':
// //           response = await handleRequestPermission(payload);
// //           break;

// //         case 'CHECK_PERMISSION':
// //           response = await handleCheckPermission(payload);
// //           break;

// //         case 'GET_CURRENT_LOCATION':
// //           response = await handleGetCurrentLocation();
// //           break;

// //         case 'START_LOCATION_TRACKING':
// //           response = await handleStartLocationTracking(payload);
// //           break;

// //         case 'STOP_LOCATION_TRACKING':
// //           response = await handleStopLocationTracking();
// //           break;

// //         case 'SHOW_NOTIFICATION':
// //           response = await handleShowNotification(payload);
// //           break;

// //         case 'PLAY_AUDIO':
// //           response = await handlePlayAudio(payload);
// //           break;

// //         case 'GO_ONLINE':
// //           response = await handleGoOnline(payload);
// //           break;

// //         case 'GO_OFFLINE':
// //           response = await handleGoOffline(payload);
// //           break;

// //         default:
// //           logger.warn(`Unknown message type: ${type}`);
// //           response = { error: 'Unknown message type' };
// //       }

// //       // Send response back to WebView if requestId provided
// //       if (requestId) {
// //         const messageToSend = {
// //           type: type,
// //           requestId,
// //           payload: response?.error ? null : response,
// //           error: response?.error || undefined
// //         };
        
// //         logger.info(`Sending response back to WebView for ${type}`, messageToSend);
        
// //         if (webViewRef.current) {
// //           webViewRef.current.postMessage(JSON.stringify(messageToSend));
// //         }
// //       }
// //     } catch (error: any) {
// //       logger.error('Error handling WebView message:', error);

// //       // Send error response
// //       try {
// //         const { requestId, type } = JSON.parse(event.nativeEvent.data);
// //         if (requestId && webViewRef.current) {
// //           webViewRef.current.postMessage(JSON.stringify({
// //             type: type,
// //             requestId,
// //             payload: null,
// //             error: error.message
// //           }));
// //         }
// //       } catch {}
// //     }
// //   };

// //   // Initialize Services (called after user authentication)
// //   const handleInitializeServices = async (payload: any) => {
// //     try {
// //       const { userId, frontendName, socketServerUrl } = payload;

// //       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

// //       if (servicesInitialized) {
// //         logger.warn('Services already initialized');
// //         return { success: true, reason: 'already_initialized' };
// //       }

// //       const deviceInfo = await getDeviceInfo();
// //       const deviceId = deviceInfo.deviceId;
// //       deviceIdRef.current = deviceId;
// //       userIdRef.current = userId;
// //       frontendNameRef.current = frontendName;
      
// //       LocationService.setDeviceId(deviceId);

// //       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

// //       if (!permissionsGranted.location) {
// //         logger.error('Location permission denied - cannot initialize');
// //         return {
// //           success: false,
// //           error: 'Location permission required',
// //           permissions: permissionsGranted,
// //         };
// //       }

// //       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
// //       const servicesStarted = await BackgroundService.start({
// //         deviceId,
// //         userId,
// //         frontendName,
// //         socketServerUrl: socketUrl,
// //       });

// //       if (!servicesStarted) {
// //         logger.error('Failed to start background services');
// //         return {
// //           success: false,
// //           error: 'Failed to start services',
// //         };
// //       }

// //       setupSocketListeners(deviceId, frontendName);

// //       setServicesInitialized(true);
// //       logger.info('✅ Services initialized successfully');

// //       return {
// //         success: true,
// //         deviceId,
// //         permissions: permissionsGranted,
// //         socketConnected: DeviceSocketService.isConnected(),
// //       };
// //     } catch (error: any) {
// //       logger.error('Error initializing services:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Request Permission
// //   const handleRequestPermission = async (payload: any) => {
// //     const { permissionType } = payload;
// //     logger.info(`Requesting permission: ${permissionType}`);

// //     try {
// //       const status = await PermissionManager.request(permissionType);
// //       return { status };
// //     } catch (error: any) {
// //       logger.error(`Error requesting ${permissionType}:`, error);
// //       return { status: 'denied', error: error.message };
// //     }
// //   };

// //   // Check Permission
// //   const handleCheckPermission = async (payload: any) => {
// //     const { permissionType } = payload;
// //     const status = await PermissionManager.check(permissionType);
// //     return { status };
// //   };

// //   // Log from WebView
// //   const handleLogDataFromWebView = async (payload: any) => {
// //     console.log('Log from webview', payload);
// //     return { success: true };
// //   };

// //   // Get Current Location
// //   const handleGetCurrentLocation = async () => {
// //     try {
// //       logger.info('Getting current location...');
// //       const location = await LocationService.getCurrentLocation();
      
// //       if (!location) {
// //         logger.warn('Could not get location');
// //         return { error: 'Could not get location' };
// //       }

// //       return location;
// //     } catch (error: any) {
// //       logger.error('Error getting location:', error);
// //       return { error: error.message };
// //     }
// //   };

// //   // Start Location Tracking
// //   const handleStartLocationTracking = async (payload: any) => {
// //     try {
// //       if (!deviceIdRef.current) {
// //         throw new Error('Device not initialized');
// //       }

// //       const success = await LocationService.startPersistentTracking(deviceIdRef.current);
      
// //       if (success) {
// //         logger.info('Location tracking started successfully');
// //       }
      
// //       return { success };
// //     } catch (error: any) {
// //       logger.error('Error starting location tracking:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Stop Location Tracking
// //   const handleStopLocationTracking = async () => {
// //     try {
// //       await LocationService.stopPersistentTracking();
// //       logger.info('Location tracking stopped successfully');
// //       return { success: true };
// //     } catch (error: any) {
// //       logger.error('Error stopping location tracking:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Show Notification
// //   const handleShowNotification = async (payload: any) => {
// //     try {
// //       await NotificationService.show(payload);
// //       return { success: true };
// //     } catch (error: any) {
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Play Audio
// //   const handlePlayAudio = async (payload: any) => {
// //     const { soundFile } = payload;
// //     try {
// //       await AudioService.playAlert(soundFile);
// //       return { success: true };
// //     } catch (error: any) {
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Go Online (Driver)
// //   const handleGoOnline = async (payload: any) => {
// //     try {
// //       const location = await LocationService.getCurrentLocation();

// //       if (!location) {
// //         throw new Error('Cannot get current location');
// //       }

// //       await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.ONLINE, {
// //         driverId: userIdRef.current,
// //         location: {
// //           lat: location.coords.latitude,
// //           lng: location.coords.longitude,
// //         },
// //       });

// //       if (deviceIdRef.current) {
// //         const trackingStarted = await LocationService.startPersistentTracking(deviceIdRef.current);
// //         if (trackingStarted) {
// //           isOnlineRef.current = true;
// //           logger.info('Location tracking started when going online');
// //         } else {
// //           logger.warn('Failed to start location tracking when going online');
// //         }
// //       }

// //       return {
// //         success: true,
// //         location: {
// //           lat: location.coords.latitude,
// //           lng: location.coords.longitude,
// //         },
// //       };
// //     } catch (error: any) {
// //       logger.error('Error going online:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Go Offline (Driver)
// //   const handleGoOffline = async (payload: any) => {
// //     try {
// //       await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.OFFLINE, {
// //         driverId: userIdRef.current,
// //       });

// //       if (isOnlineRef.current) {
// //         await LocationService.stopPersistentTracking();
// //         isOnlineRef.current = false;
// //         logger.info('Location tracking stopped when going offline');
// //       }

// //       return { success: true };
// //     } catch (error: any) {
// //       logger.error('Error going offline:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // WebView error handler
// //   const handleWebViewError = (syntheticEvent: any) => {
// //     const { nativeEvent } = syntheticEvent;
// //     logger.error('WebView error:', nativeEvent);
// //     setHasError(true);
// //   };

// //   // WebView load end handler
// //   const handleLoadEnd = () => {
// //     logger.info('loading ended');
// //     setIsLoading(false);
// //   };

// //   // Render error state
// //   if (hasError) {
// //     return (
// //       <View style={styles.errorContainer}>
// //         <Text style={styles.errorTitle}>😔 Oops!</Text>
// //         <Text style={styles.errorText}>
// //           Something went wrong loading the app.
// //         </Text>
// //         <Text style={styles.errorSubtext}>
// //           Please check your internet connection and try again.
// //         </Text>
// //       </View>
// //     );
// //   }

// //   // Render offline state
// //   if (!isConnected) {
// //     return (
// //       <View style={styles.offlineContainer}>
// //         <Text style={styles.offlineTitle}>📡 No Connection</Text>
// //         <Text style={styles.offlineText}>
// //           You're currently offline. Please check your internet connection.
// //         </Text>
// //       </View>
// //     );
// //   }

// //   return (
// //     <SafeAreaView style={styles.container}>
// //       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
// //       <WebView
// //         ref={webViewRef}
// //         source={{ uri: FRONTEND_URL }}
// //         onMessage={onMessage}
// //         javaScriptEnabled={true}
// //         domStorageEnabled={true}
// //         geolocationEnabled={true}
// //         startInLoadingState={true}
// //         originWhitelist={['*']}
// //         allowsInlineMediaPlayback={true}
// //         mediaPlaybackRequiresUserAction={false}
// //         style={styles.webview}
// //         onError={handleWebViewError}
// //         onLoadEnd={handleLoadEnd}
// //         onHttpError={(syntheticEvent) => {
// //           const { nativeEvent } = syntheticEvent;
// //           logger.error('WebView HTTP error:', nativeEvent.statusCode);
// //         }}
// //         cacheEnabled={true}
// //         cacheMode="LOAD_DEFAULT"
// //         mixedContentMode="always"
// //         allowFileAccess={false}
// //         allowUniversalAccessFromFileURLs={false}
// //       />
// //       {/* Ride Request Modal */}
// //     <RideRequestModal
// //       open={showRideRequestModal}
// //       rideRequest={currentRideRequest}
// //       onAccept={handleAcceptRide}
// //       onDecline={handleDeclineRide}
// //     />
// //     </SafeAreaView>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: '#FFFFFF',
// //   },
// //   webview: {
// //     flex: 1,
// //   },
// //   loadingContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     backgroundColor: '#FFFFFF',
// //   },
// //   loadingText: {
// //     marginTop: 16,
// //     fontSize: 16,
// //     color: '#666666',
// //   },
// //   errorContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     backgroundColor: '#FFFFFF',
// //     padding: 24,
// //   },
// //   errorTitle: {
// //     fontSize: 48,
// //     marginBottom: 16,
// //   },
// //   errorText: {
// //     fontSize: 18,
// //     fontWeight: '600',
// //     color: '#1A1A1A',
// //     textAlign: 'center',
// //     marginBottom: 8,
// //   },
// //   errorSubtext: {
// //     fontSize: 14,
// //     color: '#666666',
// //     textAlign: 'center',
// //   },
// //   offlineContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     backgroundColor: '#FFFFFF',
// //     padding: 24,
// //   },
// //   offlineTitle: {
// //     fontSize: 48,
// //     marginBottom: 16,
// //   },
// //   offlineText: {
// //     fontSize: 16,
// //     color: '#666666',
// //     textAlign: 'center',
// //   },
// // });
// import React, { useRef, useEffect, useState, useCallback } from 'react';
// import {
//   StatusBar,
//   Platform,
//   AppState,
//   StyleSheet,
//   View,
//   Text,
//   ActivityIndicator,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { WebView } from 'react-native-webview';
// import * as Notifications from 'expo-notifications';
// import * as TaskManager from 'expo-task-manager';
// import NetInfo from '@react-native-community/netinfo';
// import FloatingBubbleService from './src/services/FloatingBubbleService';
// import BackgroundService from './src/services/BackgroundService';
// import DeviceSocketService from './src/services/DeviceSocketService';
// import LocationService from './src/services/LocationService';
// import NotificationService from './src/services/NotificationService';
// import PermissionManager from './src/services/PermissionManager';
// import AudioService from './src/services/AudioService';
// import DeepLinkService from './src/services/DeepLinkService';
// import { getDeviceInfo } from './src/utils/device-info';
// import { logger } from './src/utils/logger';
// import { NavigationHelper } from './src/utils/navigation';
// import { SOCKET_EVENTS, WEBVIEW_EVENTS, CONSTANTS } from './src/utils/constants';
// import type { WebViewMessage } from './src/types/messages';
// import OkraSkeletonLoader from '@components/OkraSkeletonLoader';
// import { RideRequestModal } from './src/components/RideRequestModal';

// // Define background notification task
// TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
//   if (error) {
//     logger.error('Background notification task error:', error);
//     return;
//   }

//   if (data) {
//     await NotificationService.handleBackgroundNotification(data);
//   }
// });

// const API_URL = CONSTANTS.BACKEND_URL
// const FRONTEND_URL = __DEV__
//   ? Platform.OS === 'android'
//     ? 'http://10.64.246.23:3000/' // Android emulator
//     : 'http://10.64.246.23:3000' // iOS simulator
//   : CONSTANTS.FRONTEND_URLS.landing;

// // helper function to get frontend URLs
// const getFrontendUrls = async () => {
//   try {
//     const response = await fetch(`${API_URL}/frontend-url`);
//     if (!response.ok) {
//       throw new Error('Failed to fetch URLs');
//     }
//     const res = await response.json();
//     return res?.data?.paths || {};
//   } catch (error) {
//     logger.error('Error fetching frontend URLs:', error);
//     return {};
//   }
// }

// export default function App() {
//   const webViewRef = useRef<WebView>(null);
//   const [appState, setAppState] = useState(AppState.currentState);
//   const [servicesInitialized, setServicesInitialized] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [hasError, setHasError] = useState(false);
//   const [isConnected, setIsConnected] = useState(true);
  
//   const deviceIdRef = useRef<string | null>(null);
//   const userIdRef = useRef<string | number | null>(null);
//   const frontendNameRef = useRef<string | null>(null);
//   const isOnlineRef = useRef<boolean>(false); // Track online/offline state
//   const [showRideRequestModal, setShowRideRequestModal] = useState(false);
//   const [currentRideRequest, setCurrentRideRequest] = useState<any>(null);

//   // Send message to WebView
//   const sendToWebView = useCallback((data: any) => {
//     if (!webViewRef.current) {
//       logger.warn('Cannot send to WebView: ref is null');
//       return;
//     }

//     NavigationHelper.sendMessage(webViewRef, data.type, data.payload);
//   }, []);

//   // Handler functions for accepting/declining rides
//   const handleAcceptRide = async (rideId: string) => {
//     logger.info('Accepting ride:', rideId);
    
//     if (!currentRideRequest) {
//       logger.error('No current ride request data');
//       return;
//     }
    
//     setShowRideRequestModal(false);
    
//     try {
//       setIsLoading(true);
      
//       // Call the accept ride API endpoint
//       const { deviceId } = await getDeviceInfo();
//       const response = await fetch(`${API_URL}/devices/acceptride/${deviceId}`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       });

//       if (!response.ok) {
//         throw new Error('Failed to accept ride');
//       }

//       const result = await response.json();
//       logger.info('Ride accepted successfully:', result);

//       // Emit socket event for real-time updates
//       await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.ACCEPTED, { rideId });

//       // Get frontend URLs
//       const urls = await getFrontendUrls();
      
//       // Determine the correct URL based on userType from the request data
//       let targetUrl = '';
//       const userType = currentRideRequest.userType;
      
//       if (userType === 'driver') {
//         targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
//       } else if (userType === 'delivery') {
//         targetUrl = urls['okra-delivery-app'] || 'http://10.64.246.23:3003';
//       } else if (userType === 'conductor') {
//         targetUrl = urls['okra-conductor-app'] || 'http://10.64.246.23:3004';
//       } else {
//         logger.warn(`Unknown userType: ${userType}, defaulting to driver app`);
//         targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
//       }
      
//       // Navigate to active ride page
//       if (webViewRef.current) {
//         webViewRef.current.injectJavaScript(`
//           window.location.href = "${targetUrl}/active-ride/${rideId}";
//         `)
//       }
      
//       logger.info(`Navigating ${userType} to: ${targetUrl}/active-ride/${rideId}`);
      
//       // Clear the current request
//       setCurrentRideRequest(null);
      
//     } catch (error) {
//       logger.error('Error accepting ride:', error);
      
//       // Show error to user
//       setShowRideRequestModal(true); // Show modal again
      
//       // Optionally show an alert
//       if (webViewRef.current) {
//         webViewRef.current.injectJavaScript(`
//           alert('Failed to accept ride. Please try again.');
//         `);
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleDeclineRide = async (rideId: string) => {
//     logger.info('Declining ride:', rideId);
    
//     if (!currentRideRequest) {
//       logger.error('No current ride request data');
//       return;
//     }
    
//     setShowRideRequestModal(false);
    
//     try {
//       setIsLoading(true);
      
//       // Call the decline ride API endpoint
//       const response = await fetch(`${API_URL}/rides/${rideId}/decline`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           reason: 'Driver declined',
//         }),
//       });

//       if (!response.ok) {
//         throw new Error('Failed to decline ride');
//       }

//       const result = await response.json();
//       logger.info('Ride declined successfully:', result);

//       // Emit socket event for real-time updates
//       await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.DECLINE, { 
//         rideId, 
//         reason: 'Driver declined' 
//       });
      
//       logger.info(`Ride declined by ${currentRideRequest.userType}`);
      
//       // Clear the current request
//       setCurrentRideRequest(null);
      
//     } catch (error) {
//       logger.error('Error declining ride:', error);
      
//       // Still clear the request even if API fails
//       setCurrentRideRequest(null);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Initialize notification service on mount
//   useEffect(() => {
//     const initNotifications = async () => {
//       await NotificationService.initialize(sendToWebView);
//     };

//     initNotifications();

//     return () => {
//       NotificationService.cleanup();
//     };
//   }, [sendToWebView]);

//   // Listen for notification responses (Accept/Decline buttons)
//   useEffect(() => {
//     const subscription = Notifications.addNotificationResponseReceivedListener(response => {
//       logger.info('📨 Notification response received:', response);

//       const { actionIdentifier, notification } = response;
//       const data = notification.request.content.data;

//       if (data.type === 'ride_request') {
//         if (actionIdentifier === 'accept') {
//           logger.info('✅ User accepted ride from notification:', data.rideId);
          
//           // Set current ride request and accept
//           setCurrentRideRequest(data);
//           handleAcceptRide(String(data.rideId));
          
//         } else if (actionIdentifier === 'decline') {
//           logger.info('❌ User declined ride from notification:', data.rideId);
          
//           // Set current ride request and decline
//           setCurrentRideRequest(data);
//           handleDeclineRide(String(data.rideId));
          
//         } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
//           // User tapped the notification (not a button)
//           logger.info('👆 User tapped notification:', data.rideId);
          
//           // Show the modal with ride details
//           setCurrentRideRequest(data);
//           setShowRideRequestModal(true);
//         }
//       }
//     });

//     return () => subscription.remove();
//   }, []);

//   // Monitor network connectivity
//   useEffect(() => {
//     const handleActiveRide = async () => {
//       try {
//         const { deviceId } = await getDeviceInfo();
//         console.log('rides API_URL', API_URL)
//         const rideResponse = await fetch(`${API_URL}/devices/activeride/${deviceId}`);
//         console.log("Response received:", rideResponse.status);
        
//         if (!rideResponse.ok) {
//           throw new Error('Failed to fetch URLs')
//         }
        
//         const rideRes = await rideResponse.json();
//         console.log('rides-ridesResponse', rideRes)
        
//         if (rideRes.data) {
//           const urls = await getFrontendUrls();
          
//           if (typeof window !== "undefined" && rideRes?.success) {
//             const ride = rideRes?.data // get actual active ride itself
            
//             if (rideRes.userRole === "rider") {
//               if (ride.rideStatus === 'pending') {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-rider-app']}/finding-driver?rideId=${ride.id}";
//                 `)
//               } else if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-rider-app']}/tracking?rideId=${ride.id}";
//                 `)
//               }
//             } else if (rideRes.userRole === "driver") {
//               if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-driver-app']}/active-ride/${ride.id}";
//                 `)
//               }
//             } else if (rideRes.userRole === "delivery") {
//               if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-delivery-app']}/active-ride/${ride.id}";
//                 `)
//               }
//             } else if (rideRes.userRole === "conductor") {
//               if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-conductor-app']}/active-ride/${ride.id}";
//                 `)
//               }
//             }
//           }
//         }
//       } catch (error) {
//         logger.error('Error handling active ride:', error);
//       }
//     }
    
//     handleActiveRide()
    
//     const unsubscribe = NetInfo.addEventListener(state => {
//       setIsConnected(state.isConnected ?? false);
      
//       if (state.isConnected && servicesInitialized) {
//         // Reconnect socket if disconnected
//         if (!DeviceSocketService.isConnected()) {
//           logger.info('Network restored, reconnecting socket...');
//           DeviceSocketService.reconnect();
//         }
//       }
//     });

//     return () => unsubscribe();
//   }, [servicesInitialized]);
 
//   // Handle App State Changes
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', async (nextAppState) => {
//       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

//       if (appState.match(/inactive|background/) && nextAppState === 'active') {
//         // App came to foreground
//         logger.info('App resumed to foreground');

//         // Check socket connection health
//         if (servicesInitialized && !DeviceSocketService.isConnected()) {
//           logger.warn('Socket disconnected, attempting reconnect');
//           await DeviceSocketService.reconnect();
//         }

//         // Notify WebView
//         sendToWebView({ type: WEBVIEW_EVENTS.APP_RESUMED, payload: {} });
//       } else if (nextAppState === 'background') {
//         logger.info('App moved to background');
        
//         // Ensure background service is running (Android)
//         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
//           await BackgroundService.ensureForegroundService();
//         }
//       }

//       setAppState(nextAppState);
//     });

//     return () => subscription.remove();
//   }, [appState, servicesInitialized, sendToWebView]);

//   // Setup Socket Listeners (called after initialization)
//   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
//     logger.info(`Setting up socket listeners for ${frontendName}`);

//     // ==================== CORE DEVICE EVENTS ====================
    
//     // Listen for location requests from backend
//     DeviceSocketService.on(SOCKET_EVENTS.CONNECTION.GET_CURRENT_LOCATION, async () => {
//       console.log('socketlog- getCurrentLocation: Backend requested current location');
//       logger.info('Received location request from backend via socket');
//       try {
//         const location = await LocationService.getCurrentLocation();
//         if (location) {
//           sendToWebView({
//             type: WEBVIEW_EVENTS.LOCATION_UPDATE,
//             payload: {
//               lat: location.coords.latitude,
//               lng: location.coords.longitude,
//               accuracy: location.coords.accuracy,
//               heading: location.coords.heading,
//               speed: location.coords.speed,
//             },
//           });
//         }
//       } catch (error) {
//         logger.error('Error getting location on request:', error);
//       }
//     });

//     // Listen for notifications
//     DeviceSocketService.on('showNotification', async (notification: any) => {
//       console.log('socketlog- showNotification:', JSON.stringify(notification, null, 2));
//       logger.info('Received notification request:', notification.type);
//       await NotificationService.show(notification);

//       sendToWebView({
//         type: WEBVIEW_EVENTS.NOTIFICATION_RECEIVED,
//         payload: notification,
//       });
//     });

//     // Listen for draw-over requests (Android only, non-rider)
//     if (Platform.OS === 'android' && frontendName !== 'rider') {
//       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
//         console.log('socketlog- showDrawOver:', JSON.stringify(overlayData, null, 2));
//         logger.info('Received draw-over request');

//         if (overlayData.shouldDrawOver === false) {
//           logger.info('shouldDrawOver is false, skipping overlay - showing notification instead');
          
//           // Use the new showRideRequest method
//           await NotificationService.showRideRequest({
//             rideId: overlayData.rideId,
//             rideCode: overlayData.rideCode,
//             riderName: overlayData.riderName,
//             pickupAddress: overlayData.pickupLocation?.address || overlayData.pickupAddress || 'Pickup',
//             dropoffAddress: overlayData.dropoffLocation?.address || overlayData.dropoffAddress || 'Dropoff',
//             estimatedFare: overlayData.estimatedFare || 0,
//             distance: overlayData.distance || 0,
//             pickupLocation: overlayData.pickupLocation,
//             dropoffLocation: overlayData.dropoffLocation,
//           });
          
//           sendToWebView({
//             type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW,
//             payload: overlayData,
//           });
          
//           return;
//         }

//         await AudioService.playAlert("ride_request");

//         const hasPermission = await PermissionManager.checkDrawOverPermission();
//         if (hasPermission) {
//           await BackgroundService.showRideRequest(overlayData);
//         }

//         // Use the new showRideRequest method
//         await NotificationService.showRideRequest({
//           rideId: overlayData.rideId,
//           rideCode: overlayData.rideCode,
//           riderName: overlayData.riderName,
//           pickupAddress: overlayData.pickupLocation?.address || overlayData.pickupAddress || 'Pickup',
//           dropoffAddress: overlayData.dropoffLocation?.address || overlayData.dropoffAddress || 'Dropoff',
//           estimatedFare: overlayData.estimatedFare || 0,
//           distance: overlayData.distance || 0,
//           pickupLocation: overlayData.pickupLocation,
//           dropoffLocation: overlayData.dropoffLocation,
//         });

//         sendToWebView({
//           type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW,
//           payload: overlayData,
//         });
//       });
//     }

//     // ==================== RIDE LIFECYCLE EVENTS (RIDER-FOCUSED) ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_CREATED, (data: any) => {
//       console.log('socketlog- ride:request:created:', JSON.stringify(data, null, 2));
//       sendToWebView({
//         type: WEBVIEW_EVENTS.RIDE_REQUEST_CREATED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_NEW, async (data: any) => {
//       console.log('socketlog- ride:request:new:', JSON.stringify(data, null, 2));
      
//       await AudioService.playAlert('ride_request');
      
//       setCurrentRideRequest(data);
//       setShowRideRequestModal(true);
      
//       // Use the new showRideRequest method with proper data transformation
//       await NotificationService.showRideRequest({
//         rideId: data.rideId,
//         rideCode: data.rideCode,
//         riderName: data.riderName,
//         pickupAddress: data.pickupLocation?.address || data.pickupAddress || 'Pickup',
//         dropoffAddress: data.dropoffLocation?.address || data.dropoffAddress || 'Dropoff',
//         estimatedFare: data.estimatedFare || 0,
//         distance: data.distance || 0,
//         pickupLocation: data.pickupLocation,
//         dropoffLocation: data.dropoffLocation,
//       });
      
//       const hasPermission = await PermissionManager.checkDrawOverPermission();
//       if (hasPermission) {
//         await BackgroundService.showRideRequest(data);
//       }

//       sendToWebView({
//         type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_RECEIVED, async (data: any) => {
//       console.log('socketlog- ride:request:received:', data);
      
//       await AudioService.playAlert('ride_request');
      
//       setCurrentRideRequest(data);
//       setShowRideRequestModal(true);
      
//       // Use the new showRideRequest method with proper data transformation
//       await NotificationService.showRideRequest({
//         rideId: data.rideId,
//         rideCode: data.rideCode,
//         riderName: data.riderName,
//         pickupAddress: data.pickupLocation?.address || data.pickupAddress || 'Pickup',
//         dropoffAddress: data.dropoffLocation?.address || data.dropoffAddress || 'Dropoff',
//         estimatedFare: data.estimatedFare || 0,
//         distance: data.distance || 0,
//         pickupLocation: data.pickupLocation,
//         dropoffLocation: data.dropoffLocation,
//       });
      
//       const hasPermission = await PermissionManager.checkDrawOverPermission();
//       if (hasPermission) {
//         await BackgroundService.showRideRequest(data);
//       }

//       sendToWebView({
//         type: WEBVIEW_EVENTS.RIDE_REQUEST_RECEIVED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPTED, async (data: any) => {
//       console.log('socketlog- ride:accepted:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Ride Accepted',
//         body: 'Your driver has accepted the ride request',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.RIDE_ACCEPTED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TAKEN, (data: any) => {
//       console.log('socketlog- ride:taken:', JSON.stringify(data, null, 2));
//       sendToWebView({
//         type: WEBVIEW_EVENTS.RIDE_TAKEN,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ARRIVED, async (data: any) => {
//       console.log('socketlog- ride:driver:arrived:', JSON.stringify(data, null, 2));
      
//       await AudioService.playAlert('driver_arrived');
      
//       await NotificationService.showHighPriority({
//         title: 'Driver Arrived',
//         body: 'Your driver is waiting for you',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.DRIVER_ARRIVED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_STARTED, async (data: any) => {
//       console.log('socketlog- ride:trip:started:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Trip Started',
//         body: 'Your trip has begun. Safe travels!',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.TRIP_STARTED,
//         payload: data,
//       });
//     })

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_COMPLETED, async (data: any) => {
//       console.log('socketlog- ride:trip:completed:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Trip Completed',
//         body: `Fare: K${data.finalFare?.toFixed(2) || 0}`,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.TRIP_COMPLETED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.CANCELLED, async (data: any) => {
//       console.log('socketlog- ride:cancelled:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Ride Cancelled',
//         body: data.reason || 'The ride has been cancelled',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.RIDE_CANCELLED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPT_SUCCESS, (data: any) => {
//       console.log('socketlog- ride:accept:success:', JSON.stringify(data, null, 2));
//       sendToWebView({
//         type: WEBVIEW_EVENTS.RIDE_ACCEPT_SUCCESS,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.DECLINE_SUCCESS, (data: any) => {
//       console.log('socketlog- ride:decline:success:', JSON.stringify(data, null, 2));
//       sendToWebView({
//         type: WEBVIEW_EVENTS.RIDE_DECLINE_SUCCESS,
//         payload: data,
//       });
//     });

//     // ==================== LOCATION EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.LOCATION_UPDATED, (data: any) => {
//       console.log('socketlog- driver:location:updated: Driver location update received');
//       sendToWebView({
//         type: WEBVIEW_EVENTS.DRIVER_LOCATION_UPDATED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDER.LOCATION_UPDATED, (data: any) => {
//       console.log('socketlog- rider:location:updated: Rider location update received');
//       sendToWebView({
//         type: WEBVIEW_EVENTS.RIDER_LOCATION_UPDATED,
//         payload: data,
//       });
//     });

//     // ==================== DRIVER AVAILABILITY EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ONLINE_SUCCESS, (data: any) => {
//       console.log('socketlog- driver:online:success:', JSON.stringify(data, null, 2));
//       sendToWebView({
//         type: WEBVIEW_EVENTS.DRIVER_ONLINE_SUCCESS,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.OFFLINE_SUCCESS, (data: any) => {
//       console.log('socketlog- driver:offline:success:', JSON.stringify(data, null, 2));
//       sendToWebView({
//         type: WEBVIEW_EVENTS.DRIVER_OFFLINE_SUCCESS,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.FORCED_OFFLINE, async (data: any) => {
//       console.log('socketlog- driver:forced:offline:', JSON.stringify(data, null, 2));
      
//       await NotificationService.showHighPriority({
//         title: 'Account Status',
//         body: data.message || 'You have been taken offline',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.DRIVER_FORCED_OFFLINE,
//         payload: data,
//       });
//     });

//     // ==================== SUBSCRIPTION EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRING_WARNING, async (data: any) => {
//       console.log('socketlog- subscription:expiring:warning:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Subscription Expiring Soon',
//         body: `Your ${data.planName} plan expires in ${data.daysRemaining} days`,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRING,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRED, async (data: any) => {
//       console.log('socketlog- subscription:expired:', JSON.stringify(data, null, 2));
      
//       await NotificationService.showHighPriority({
//         title: 'Subscription Expired',
//         body: data.message || 'Your subscription has expired',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.ACTIVATED, async (data: any) => {
//       console.log('socketlog- subscription:activated:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Subscription Activated',
//         body: `Your ${data.planName} plan is now active`,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SUBSCRIPTION_ACTIVATED,
//         payload: data,
//       });
//     });

//     // ==================== PAYMENT EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.SUCCESS, async (data: any) => {
//       console.log('socketlog- payment:success:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Payment Successful',
//         body: `K${data.amount?.toFixed(2) || 0} - ${data.type}`,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.PAYMENT_SUCCESS,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.FAILED, async (data: any) => {
//       console.log('socketlog- payment:failed:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Payment Failed',
//         body: data.reason || 'Your payment could not be processed',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.PAYMENT_FAILED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.WITHDRAWAL.PROCESSED, async (data: any) => {
//       console.log('socketlog- withdrawal:processed:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Withdrawal Processed',
//         body: `K${data.amount?.toFixed(2) || 0} via ${data.method}`,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.WITHDRAWAL_PROCESSED,
//         payload: data,
//       });
//     });

//     // ==================== RATING EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.RATING.REQUEST, async (data: any) => {
//       console.log('socketlog- rating:request:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Rate Your Experience',
//         body: `Please rate your ${data.ratingType || 'recent'} trip`,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.RATING_REQUEST,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RATING.SUBMITTED, (data: any) => {
//       console.log('socketlog- rating:submitted:', JSON.stringify(data, null, 2));
//       sendToWebView({
//         type: WEBVIEW_EVENTS.RATING_SUBMITTED,
//         payload: data,
//       });
//     });

//     // ==================== NOTIFICATION EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.NEW, async (data: any) => {
//       console.log('socketlog- notification:new:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show(data);
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.NOTIFICATION_NEW,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.BROADCAST, async (data: any) => {
//       console.log('socketlog- notification:broadcast:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: data.title || 'Announcement',
//         body: data.message || data.body,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.NOTIFICATION_BROADCAST,
//         payload: data,
//       });
//     });

//     // ==================== SOS & EMERGENCY EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.SOS.TRIGGERED, async (data: any) => {
//       console.log('socketlog- sos:triggered:', JSON.stringify(data, null, 2));
      
//       await NotificationService.showHighPriority({
//         title: 'SOS Alert Sent',
//         body: 'Emergency services have been notified',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SOS_TRIGGERED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.SOS.ACKNOWLEDGED, async (data: any) => {
//       console.log('socketlog- sos:acknowledged:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'SOS Acknowledged',
//         body: `Your alert has been acknowledged by ${data.acknowledgedBy}`,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SOS_ACKNOWLEDGED,
//         payload: data,
//       });
//     });

//     // ==================== AFFILIATE EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.REFERRAL_SIGNUP, async (data: any) => {
//       console.log('socketlog- affiliate:referral:signup:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Referral Signup',
//         body: `${data.referredUser} signed up! +${data.points} points`,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.AFFILIATE_REFERRAL_SIGNUP,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.COMMISSION_EARNED, async (data: any) => {
//       console.log('socketlog- affiliate:commission:earned:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Commission Earned',
//         body: `K${data.amount?.toFixed(2) || 0} commission earned`,
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.AFFILIATE_COMMISSION_EARNED,
//         payload: data,
//       });
//     });

//     // ==================== SYSTEM EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.SYSTEM.ANNOUNCEMENT, async (data: any) => {
//       console.log('socketlog- system:announcement:', JSON.stringify(data, null, 2));
      
//       if (data.priority === 'high' || data.priority === 'urgent') {
//         await NotificationService.showHighPriority({
//           title: 'Important Announcement',
//           body: data.message,
//           data,
//         });
//       } else {
//         await NotificationService.show({
//           title: 'Announcement',
//           body: data.message,
//           data,
//         });
//       }
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SYSTEM_ANNOUNCEMENT,
//         payload: data,
//       });
//     });

//     // ==================== SESSION EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.RIDER.SESSION_REPLACED, async (data: any) => {
//       console.log('socketlog- rider:session-replaced:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Session Replaced',
//         body: data.message || 'You have logged in on another device',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SESSION_REPLACED,
//         payload: data,
//       });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.SESSION_REPLACED, async (data: any) => {
//       console.log('socketlog- driver:session-replaced:', JSON.stringify(data, null, 2));
      
//       await NotificationService.show({
//         title: 'Session Replaced',
//         body: data.message || 'You have logged in on another device',
//         data,
//       });
      
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SESSION_REPLACED,
//         payload: data,
//       });
//     });

//     // ==================== CONNECTION STATUS EVENTS ====================
    
//     DeviceSocketService.on(SOCKET_EVENTS.CONNECTED, () => {
//       console.log('socketlog- connected: Socket connection established');
//       logger.info('Device socket connected');
//       sendToWebView({ type: WEBVIEW_EVENTS.SOCKET_CONNECTED, payload: {} });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DISCONNECTED, (data: any) => {
//       console.log('socketlog- disconnected:', JSON.stringify(data, null, 2));
//       logger.warn('Device socket disconnected:', data.reason);
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SOCKET_DISCONNECTED,
//         payload: data,
//       });
//     });

//     // ==================== ERROR EVENTS ====================
    
//     DeviceSocketService.on('socket_error', (data: any) => {
//       console.log('socketlog- socket_error:', JSON.stringify(data, null, 2));
//       logger.error('Socket error received:', data);
//       sendToWebView({
//         type: WEBVIEW_EVENTS.SOCKET_ERROR,
//         payload: data,
//       });
//     });

//     logger.info('✅ All socket event listeners registered');
//   }, [sendToWebView]);

//   // Handle messages from WebView
//   const onMessage = async (event: any) => {
//     try {
//       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
//       const { type, requestId, payload } = message;

//       logger.info(`Received message from WebView: ${type}${requestId ? ` (requestId: ${requestId})` : ''}`);

//       let response: any = null;

//       switch (type) {
//         case 'INITIALIZE_SERVICES':
//           response = await handleInitializeServices(payload);
//           break;
//         case 'LOG_DATA':
//           response = await handleLogDataFromWebView(payload);
//           break;

//         case 'REQUEST_PERMISSION':
//           response = await handleRequestPermission(payload);
//           break;

//         case 'CHECK_PERMISSION':
//           response = await handleCheckPermission(payload);
//           break;

//         case 'GET_CURRENT_LOCATION':
//           response = await handleGetCurrentLocation();
//           break;

//         case 'START_LOCATION_TRACKING':
//           response = await handleStartLocationTracking(payload);
//           break;

//         case 'STOP_LOCATION_TRACKING':
//           response = await handleStopLocationTracking();
//           break;

//         case 'SHOW_NOTIFICATION':
//           response = await handleShowNotification(payload);
//           break;

//         case 'PLAY_AUDIO':
//           response = await handlePlayAudio(payload);
//           break;

//         case 'GO_ONLINE':
//           response = await handleGoOnline(payload);
//           break;

//         case 'GO_OFFLINE':
//           response = await handleGoOffline(payload);
//           break;

//         default:
//           logger.warn(`Unknown message type: ${type}`);
//           response = { error: 'Unknown message type' };
//       }

//       // Send response back to WebView if requestId provided
//       if (requestId) {
//         const messageToSend = {
//           type: type,
//           requestId,
//           payload: response?.error ? null : response,
//           error: response?.error || undefined
//         };
        
//         logger.info(`Sending response back to WebView for ${type}`, messageToSend);
        
//         if (webViewRef.current) {
//           webViewRef.current.postMessage(JSON.stringify(messageToSend));
//         }
//       }
//     } catch (error: any) {
//       logger.error('Error handling WebView message:', error);

//       // Send error response
//       try {
//         const { requestId, type } = JSON.parse(event.nativeEvent.data);
//         if (requestId && webViewRef.current) {
//           webViewRef.current.postMessage(JSON.stringify({
//             type: type,
//             requestId,
//             payload: null,
//             error: error.message
//           }));
//         }
//       } catch {}
//     }
//   };

//   // Initialize Services (called after user authentication)
//   const handleInitializeServices = async (payload: any) => {
//     try {
//       const { userId, frontendName, socketServerUrl } = payload;

//       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

//       if (servicesInitialized) {
//         logger.warn('Services already initialized');
//         return { success: true, reason: 'already_initialized' };
//       }

//       const deviceInfo = await getDeviceInfo();
//       const deviceId = deviceInfo.deviceId;
//       deviceIdRef.current = deviceId;
//       userIdRef.current = userId;
//       frontendNameRef.current = frontendName;
      
//       LocationService.setDeviceId(deviceId);

//       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

//       if (!permissionsGranted.location) {
//         logger.error('Location permission denied - cannot initialize');
//         return {
//           success: false,
//           error: 'Location permission required',
//           permissions: permissionsGranted,
//         };
//       }

//       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
//       const servicesStarted = await BackgroundService.start({
//         deviceId,
//         userId,
//         frontendName,
//         socketServerUrl: socketUrl,
//       });

//       if (!servicesStarted) {
//         logger.error('Failed to start background services');
//         return {
//           success: false,
//           error: 'Failed to start services',
//         };
//       }

//       setupSocketListeners(deviceId, frontendName);

//       setServicesInitialized(true);
//       logger.info('✅ Services initialized successfully');

//       return {
//         success: true,
//         deviceId,
//         permissions: permissionsGranted,
//         socketConnected: DeviceSocketService.isConnected(),
//       };
//     } catch (error: any) {
//       logger.error('Error initializing services:', error);
//       return { success: false, error: error.message };
//     }
//   };

//   // Request Permission
//   const handleRequestPermission = async (payload: any) => {
//     const { permissionType } = payload;
//     logger.info(`Requesting permission: ${permissionType}`);

//     try {
//       const status = await PermissionManager.request(permissionType);
//       return { status };
//     } catch (error: any) {
//       logger.error(`Error requesting ${permissionType}:`, error);
//       return { status: 'denied', error: error.message };
//     }
//   };

//   // Check Permission
//   const handleCheckPermission = async (payload: any) => {
//     const { permissionType } = payload;
//     const status = await PermissionManager.check(permissionType);
//     return { status };
//   };

//   // Log from WebView
//   const handleLogDataFromWebView = async (payload: any) => {
//     console.log('Log from webview', payload);
//     return { success: true };
//   };

//   // Get Current Location
//   const handleGetCurrentLocation = async () => {
//     try {
//       logger.info('Getting current location...');
//       const location = await LocationService.getCurrentLocation();
      
//       if (!location) {
//         logger.warn('Could not get location');
//         return { error: 'Could not get location' };
//       }

//       return location;
//     } catch (error: any) {
//       logger.error('Error getting location:', error);
//       return { error: error.message };
//     }
//   };

//   // Start Location Tracking
//   const handleStartLocationTracking = async (payload: any) => {
//     try {
//       if (!deviceIdRef.current) {
//         throw new Error('Device not initialized');
//       }

//       const success = await LocationService.startPersistentTracking(deviceIdRef.current);
      
//       if (success) {
//         logger.info('Location tracking started successfully');
//       }
      
//       return { success };
//     } catch (error: any) {
//       logger.error('Error starting location tracking:', error);
//       return { success: false, error: error.message };
//     }
//   };

//   // Stop Location Tracking
//   const handleStopLocationTracking = async () => {
//     try {
//       await LocationService.stopPersistentTracking();
//       logger.info('Location tracking stopped successfully');
//       return { success: true };
//     } catch (error: any) {
//       logger.error('Error stopping location tracking:', error);
//       return { success: false, error: error.message };
//     }
//   };

//   // Show Notification
//   const handleShowNotification = async (payload: any) => {
//     try {
//       await NotificationService.show(payload);
//       return { success: true };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   // Play Audio
//   const handlePlayAudio = async (payload: any) => {
//     const { soundFile } = payload;
//     try {
//       await AudioService.playAlert(soundFile);
//       return { success: true };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   // Go Online (Driver)
//   const handleGoOnline = async (payload: any) => {
//     try {
//       const location = await LocationService.getCurrentLocation();

//       if (!location) {
//         throw new Error('Cannot get current location');
//       }

//       await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.ONLINE, {
//         driverId: userIdRef.current,
//         location: {
//           lat: location.coords.latitude,
//           lng: location.coords.longitude,
//         },
//       });

//       if (deviceIdRef.current) {
//         const trackingStarted = await LocationService.startPersistentTracking(deviceIdRef.current);
//         if (trackingStarted) {
//           isOnlineRef.current = true;
//           logger.info('Location tracking started when going online');
//         } else {
//           logger.warn('Failed to start location tracking when going online');
//         }
//       }

//       return {
//         success: true,
//         location: {
//           lat: location.coords.latitude,
//           lng: location.coords.longitude,
//         },
//       };
//     } catch (error: any) {
//       logger.error('Error going online:', error);
//       return { success: false, error: error.message };
//     }
//   };

//   // Go Offline (Driver)
//   const handleGoOffline = async (payload: any) => {
//     try {
//       await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.OFFLINE, {
//         driverId: userIdRef.current,
//       });

//       if (isOnlineRef.current) {
//         await LocationService.stopPersistentTracking();
//         isOnlineRef.current = false;
//         logger.info('Location tracking stopped when going offline');
//       }

//       return { success: true };
//     } catch (error: any) {
//       logger.error('Error going offline:', error);
//       return { success: false, error: error.message };
//     }
//   };

//   // WebView error handler
//   const handleWebViewError = (syntheticEvent: any) => {
//     const { nativeEvent } = syntheticEvent;
//     logger.error('WebView error:', nativeEvent);
//     setHasError(true);
//   };

//   // WebView load end handler
//   const handleLoadEnd = () => {
//     logger.info('loading ended');
//     setIsLoading(false);
//   };

//   // Render error state
//   if (hasError) {
//     return (
//       <View style={styles.errorContainer}>
//         <Text style={styles.errorTitle}>😔 Oops!</Text>
//         <Text style={styles.errorText}>
//           Something went wrong loading the app.
//         </Text>
//         <Text style={styles.errorSubtext}>
//           Please check your internet connection and try again.
//         </Text>
//       </View>
//     );
//   }

//   // Render offline state
//   if (!isConnected) {
//     return (
//       <View style={styles.offlineContainer}>
//         <Text style={styles.offlineTitle}>📡 No Connection</Text>
//         <Text style={styles.offlineText}>
//           You're currently offline. Please check your internet connection.
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
//       <WebView
//         ref={webViewRef}
//         source={{ uri: FRONTEND_URL }}
//         onMessage={onMessage}
//         javaScriptEnabled={true}
//         domStorageEnabled={true}
//         geolocationEnabled={true}
//         startInLoadingState={true}
//         originWhitelist={['*']}
//         allowsInlineMediaPlayback={true}
//         mediaPlaybackRequiresUserAction={false}
//         style={styles.webview}
//         onError={handleWebViewError}
//         onLoadEnd={handleLoadEnd}
//         onHttpError={(syntheticEvent) => {
//           const { nativeEvent } = syntheticEvent;
//           logger.error('WebView HTTP error:', nativeEvent.statusCode);
//         }}
//         cacheEnabled={true}
//         cacheMode="LOAD_DEFAULT"
//         mixedContentMode="always"
//         allowFileAccess={false}
//         allowUniversalAccessFromFileURLs={false}
//       />
      
//       {/* Ride Request Modal */}
//       <RideRequestModal
//         open={showRideRequestModal}
//         rideRequest={currentRideRequest}
//         onAccept={handleAcceptRide}
//         onDecline={handleDeclineRide}
//       />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFFFFF',
//   },
//   webview: {
//     flex: 1,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#666666',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     padding: 24,
//   },
//   errorTitle: {
//     fontSize: 48,
//     marginBottom: 16,
//   },
//   errorText: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#1A1A1A',
//     textAlign: 'center',
//     marginBottom: 8,
//   },
//   errorSubtext: {
//     fontSize: 14,
//     color: '#666666',
//     textAlign: 'center',
//   },
//   offlineContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     padding: 24,
//   },
//   offlineTitle: {
//     fontSize: 48,
//     marginBottom: 16,
//   },
//   offlineText: {
//     fontSize: 16,
//     color: '#666666',
//     textAlign: 'center',
//   },
// });


// //OkraApp\src\services\PermissionManager.ts
// import * as Location from 'expo-location';
// import * as Notifications from 'expo-notifications';
// import { Platform, Linking, Alert } from 'react-native';
// import { logger } from '../utils/logger';
// import * as IntentLauncher from 'expo-intent-launcher';

// interface PermissionStatus {
//   location: boolean;
//   backgroundLocation: boolean;
//   notification: boolean;
//   drawOver: boolean;
//   batteryOptimization: boolean;
// }

// class PermissionManager {
//   /**
//    * Request all critical permissions for a frontend
//    */
//   async requestCriticalPermissions(frontendName: string): Promise<PermissionStatus> {
//     logger.info(`Requesting critical permissions for ${frontendName}`);

//     const permissions: PermissionStatus = {
//       location: false,
//       backgroundLocation: false,
//       notification: false,
//       drawOver: false,
//       batteryOptimization: false,
//     };

//     // 1. Foreground location (required for all)
//     permissions.location = await this.requestLocationPermission();

//     // 2. Background location (required for drivers, conductors, delivery)
//     if (frontendName !== 'rider') {
//       permissions.backgroundLocation = await this.requestBackgroundLocationPermission();
//     }

//     // 3. Notifications (required for all)
//     permissions.notification = await this.requestNotificationPermission();

//     // 4. Draw over apps (Android only, not for riders)
//     if (Platform.OS === 'android' && frontendName !== 'rider') {
//       permissions.drawOver = await this.requestDrawOverPermission();
//     }

//     // 5. Battery optimization (Android only, not for riders)
//     if (Platform.OS === 'android' && frontendName !== 'rider') {
//       permissions.batteryOptimization = await this.requestBatteryOptimizationExemption();
//     }

//     logger.info('Permission request results:', permissions);
//     return permissions;
//   }

//   /**
//    * Request foreground location permission
//    */
//   async requestLocationPermission(): Promise<boolean> {
//     try {
//       logger.info('Requesting foreground location permission');

//       const { status } = await Location.requestForegroundPermissionsAsync();

//       if (status === 'granted') {
//         logger.info('✅ Foreground location permission granted');
//         return true;
//       }

//       logger.warn('Foreground location permission denied');
//       return false;
//     } catch (error) {
//       logger.error('Error requesting foreground location permission:', error);
//       return false;
//     }
//   }

//   /**
//    * Request background location permission
//    */
//   async requestBackgroundLocationPermission(): Promise<boolean> {
//     try {
//       logger.info('Requesting background location permission');

//       // First check if foreground permission is granted
//       const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      
//       if (foregroundStatus !== 'granted') {
//         logger.warn('Foreground permission must be granted first');
//         return false;
//       }

//       // Request background permission
//       const { status } = await Location.requestBackgroundPermissionsAsync();

//       if (status === 'granted') {
//         logger.info('✅ Background location permission granted');
//         return true;
//       }

//       // Show educational alert for "Allow all the time"
//       if (Platform.OS === 'android') {
//         Alert.alert(
//           'Background Location Required',
//           'For Okra Rides to work properly, you need to allow location access "All the time" in your device settings.\n\nThis allows you to receive ride requests even when the app is in the background.',
//           [
//             { text: 'Cancel', style: 'cancel' },
//             {
//               text: 'Open Settings',
//               onPress: () => this.openAppSettings(),
//             },
//           ]
//         );
//       } else if (Platform.OS === 'ios') {
//         Alert.alert(
//           'Background Location Required',
//           'Please select "Always Allow" when prompted, or go to Settings > Okra Rides > Location and select "Always".',
//           [
//             { text: 'OK' },
//           ]
//         );
//       }

//       logger.warn('Background location permission denied');
//       return false;
//     } catch (error) {
//       logger.error('Error requesting background location permission:', error);
//       return false;
//     }
//   }

//   /**
//    * Request notification permission
//    */
//   async requestNotificationPermission(): Promise<boolean> {
//     try {
//       logger.info('Requesting notification permission');

//       const { status: existingStatus } = await Notifications.getPermissionsAsync();
//       let finalStatus = existingStatus;

//       if (existingStatus !== 'granted') {
//         const { status } = await Notifications.requestPermissionsAsync();
//         finalStatus = status;
//       }

//       if (finalStatus === 'granted') {
//         logger.info('✅ Notification permission granted');
//         return true;
//       }

//       logger.warn('Notification permission denied');
//       return false;
//     } catch (error) {
//       logger.error('Error requesting notification permission:', error);
//       return false;
//     }
//   }

//   /**
//    * Request draw over apps permission (Android only)
//    */
//   async requestDrawOverPermission(): Promise<boolean> {
//     if (Platform.OS !== 'android') {
//       return false;
//     }

//     try {
//       logger.info('Requesting draw over apps permission');

//       Alert.alert(
//         'Display Over Other Apps',
//         'Okra Rides needs permission to display ride requests over other apps. This allows you to see incoming ride requests even when using navigation apps.\n\nYou can disable this later in settings.',
//         [
//           { text: 'Not Now', style: 'cancel' },
//           {
//             text: 'Grant Permission',
//             onPress: async () => {
//               try {
//                 // Open Android settings for SYSTEM_ALERT_WINDOW
//                 await IntentLauncher.startActivityAsync(
//                   IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION,
//                   {
//                     data: 'package:com.okraapp', // Your package name
//                   }
//                 );
//               } catch (error) {
//                 logger.error('Error opening overlay permission settings:', error);
//               }
//             },
//           },
//         ]
//       );

//       // Check permission status (will require user to come back to app)
//       // Note: Checking SYSTEM_ALERT_WINDOW permission requires native code
//       // For now, we'll assume permission is granted if user went to settings
//       return true;
//     } catch (error) {
//       logger.error('Error requesting draw over permission:', error);
//       return false;
//     }
//   }

//   /**
//    * Request battery optimization exemption (Android only)
//    */
//   async requestBatteryOptimizationExemption(): Promise<boolean> {
//     if (Platform.OS !== 'android') {
//       return false;
//     }

//     try {
//       logger.info('Requesting battery optimization exemption');

//       Alert.alert(
//         'Battery Optimization',
//         'To ensure you receive ride requests reliably, Okra Rides needs to be excluded from battery optimization.\n\nThis prevents Android from restricting the app in the background.',
//         [
//           { text: 'Not Now', style: 'cancel' },
//           {
//             text: 'Open Settings',
//             onPress: async () => {
//               try {
//                 await IntentLauncher.startActivityAsync(
//                   IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
//                   {
//                     data: 'package:com.okraapp',
//                   }
//                 );
//               } catch (error) {
//                 logger.error('Error opening battery optimization settings:', error);
//               }
//             },
//           },
//         ]
//       );

//       return true;
//     } catch (error) {
//       logger.error('Error requesting battery optimization exemption:', error);
//       return false;
//     }
//   }

//   /**
//    * Check specific permission
//    */
//   async check(permissionType: string): Promise<string> {
//     try {
//       switch (permissionType) {
//         case 'location':
//           const { status } = await Location.getForegroundPermissionsAsync();
//           return status;

//         case 'backgroundLocation':
//           const bgStatus = await Location.getBackgroundPermissionsAsync();
//           return bgStatus.status;

//         case 'notification':
//           const notifStatus = await Notifications.getPermissionsAsync();
//           return notifStatus.status;

//         default:
//           return 'unsupported';
//       }
//     } catch (error) {
//       logger.error(`Error checking ${permissionType} permission:`, error);
//       return 'denied';
//     }
//   }

//   /**
//    * Request specific permission
//    */
//   async request(permissionType: string): Promise<string> {
//     try {
//       switch (permissionType) {
//         case 'location':
//           const granted = await this.requestLocationPermission();
//           return granted ? 'granted' : 'denied';

//         case 'backgroundLocation':
//           const bgGranted = await this.requestBackgroundLocationPermission();
//           return bgGranted ? 'granted' : 'denied';

//         case 'notification':
//           const notifGranted = await this.requestNotificationPermission();
//           return notifGranted ? 'granted' : 'denied';

//         case 'drawOver':
//           const drawGranted = await this.requestDrawOverPermission();
//           return drawGranted ? 'granted' : 'denied';

//         default:
//           return 'unsupported';
//       }
//     } catch (error) {
//       logger.error(`Error requesting ${permissionType} permission:`, error);
//       return 'denied';
//     }
//   }

//   /**
//    * Check draw over permission (Android only)
//    */
//   async checkDrawOverPermission(): Promise<boolean> {
//     if (Platform.OS !== 'android') {
//       return false;
//     }

//     // This requires native module to properly check SYSTEM_ALERT_WINDOW
//     // For now, we'll assume it's granted if user has gone through setup
//     // Proper implementation would use a native module
//     return true;
//   }

//   /**
//    * Open app settings
//    */
//   async openAppSettings(): Promise<void> {
//     try {
//       if (Platform.OS === 'ios') {
//         await Linking.openURL('app-settings:');
//       } else {
//         await IntentLauncher.startActivityAsync(
//           IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
//           {
//             data: 'package:com.okraapp',
//           }
//         );
//       }
//     } catch (error) {
//       logger.error('Error opening app settings:', error);
//       Alert.alert('Error', 'Could not open settings');
//     }
//   }
// }


// // import React, { useRef, useReducer, useEffect, useState, useCallback } from 'react';
// // import {
// //   StatusBar,
// //   Platform,
// //   AppState,
// //   StyleSheet,
// //   View,
// //   Text,
// //   unstable_batchedUpdates,
// //   ActivityIndicator,
// // } from 'react-native';
// // import { SafeAreaView } from 'react-native-safe-area-context';
// // import { WebView } from 'react-native-webview';
// // import * as Notifications from 'expo-notifications';
// // import * as TaskManager from 'expo-task-manager';
// // import NetInfo from '@react-native-community/netinfo';
// // import FloatingBubbleService from './src/services/FloatingBubbleService';
// // import BackgroundService from './src/services/BackgroundService';
// // import DeviceSocketService from './src/services/DeviceSocketService';
// // import LocationService from './src/services/LocationService';
// // import NotificationService from './src/services/NotificationService';
// // import PermissionManager from './src/services/PermissionManager';
// // import AudioService from './src/services/AudioService';
// // import DeepLinkService from './src/services/DeepLinkService';
// // import { getDeviceInfo } from './src/utils/device-info';
// // import { logger } from './src/utils/logger';
// // import { NavigationHelper } from './src/utils/navigation';
// // import { SOCKET_EVENTS, WEBVIEW_EVENTS, CONSTANTS } from './src/utils/constants';
// // import type { WebViewMessage } from './src/types/messages';
// // import OkraSkeletonLoader from '@components/OkraSkeletonLoader';
// // import { RideRequestModal } from './src/components/RideRequestModal';

// // // Define background notification task
// // TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
// //   if (error) {
// //     logger.error('Background notification task error:', error);
// //     return;
// //   }

// //   if (data) {
// //     await NotificationService.handleBackgroundNotification(data);
// //   }
// // });

// // const API_URL = CONSTANTS.BACKEND_URL
// // const FRONTEND_URL = __DEV__
// //   ? Platform.OS === 'android'
// //     ? 'http://10.64.246.23:3000/' // Android emulator
// //     : 'http://10.64.246.23:3000' // iOS simulator
// //   : CONSTANTS.FRONTEND_URLS.landing;

// // // helper function to get frontend URLs
// // const getFrontendUrls = async () => {
// //   try {
// //     const response = await fetch(`${API_URL}/frontend-url`);
// //     if (!response.ok) {
// //       throw new Error('Failed to fetch URLs');
// //     }
// //     const res = await response.json();
// //     return res?.data?.paths || {};
// //   } catch (error) {
// //     logger.error('Error fetching frontend URLs:', error);
// //     return {};
// //   }
// // }

// // export default function App() {
// //   const webViewRef = useRef<WebView>(null);
// //   const [appState, setAppState] = useState(AppState.currentState);
// //   const [servicesInitialized, setServicesInitialized] = useState(false);
// //   const [isLoading, setIsLoading] = useState(true);
// //   const [hasError, setHasError] = useState(false);
// //   const [isConnected, setIsConnected] = useState(true);
// //   const deviceIdRef = useRef<string | null>(null);
// //   const userIdRef = useRef<string | number | null>(null);
// //   const frontendNameRef = useRef<string | null>(null);
// //   const isOnlineRef = useRef<boolean>(false); // Track online/offline state
// //   const [userHasRideRequest, setUserHasRideRequest] = useState(false);
// //   const [showRideRequestModal, setShowRideRequestModal] = useState(false);
// //   const [currentRideRequest, setCurrentRideRequest] = useState<any>(null);
// //   const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

// //   // Send message to WebView
// //   const sendToWebView = useCallback((data: any) => {
// //     if (!webViewRef.current) {
// //       logger.warn('Cannot send to WebView: ref is null');
// //       return;
// //     }

// //     NavigationHelper.sendMessage(webViewRef, data.type, data.payload);
// //   }, []);
 
// //   // Handler functions for accepting/declining rides
// //   const handleAcceptRide = async (rideId: string) => {
// //     logger.info('Accepting ride:', rideId);
    
// //     if (!currentRideRequest) {
// //       logger.error('No current ride request data');
// //       return;
// //     }
    
// //     setShowRideRequestModal(false);
    
// //     try {
// //       setIsLoading(true);
      
// //       // Call the accept ride API endpoint
// //       const { deviceId } = await getDeviceInfo();
// //       const response = await fetch(`${API_URL}/devices/acceptride/${deviceId}`, {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //         },
// //       });

// //       if (!response.ok) {
// //         throw new Error('Failed to accept ride');
// //       }

// //       const result = await response.json();
// //       logger.info('Ride accepted successfully:', result);

// //       // DECREMENT BADGE after accepting
// //       await FloatingBubbleService.decrementBadge();

// //       // Emit socket event for real-time updates
// //       await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.ACCEPTED, { rideId });

// //       // Get frontend URLs
// //       const urls = await getFrontendUrls();
      
// //       // Determine the correct URL based on userType from the request data
// //       let targetUrl = '';
// //       const userType = currentRideRequest.userType;
      
// //       if (userType === 'driver') {
// //         targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
// //       } else if (userType === 'delivery') {
// //         targetUrl = urls['okra-delivery-app'] || 'http://10.64.246.23:3003';
// //       } else if (userType === 'conductor') {
// //         targetUrl = urls['okra-conductor-app'] || 'http://10.64.246.23:3004';
// //       } else {
// //         logger.warn(`Unknown userType: ${userType}, defaulting to driver app`);
// //         targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
// //       }
      
// //       // Navigate to active ride page
// //       if (webViewRef.current) {
// //         webViewRef.current.injectJavaScript(`
// //           window.location.href = "${targetUrl}/active-ride/${rideId}";
// //         `)
// //       }
      
// //       logger.info(`Navigating ${userType} to: ${targetUrl}/active-ride/${rideId}`);
      
// //       // Clear the current request
// //       setCurrentRideRequest(null);
      
// //     } catch (error) {
// //       logger.error('Error accepting ride:', error);
      
// //       // Show error to user
// //       setShowRideRequestModal(true); // Show modal again
      
// //       // Optionally show an alert
// //       if (webViewRef.current) {
// //         webViewRef.current.injectJavaScript(`
// //           alert('Failed to accept ride. Please try again.');
// //         `);
// //       }
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handleDeclineRide = async (rideId: string) => {
// //     logger.info('Declining ride:', rideId);
    
// //     if (!currentRideRequest) {
// //       logger.error('No current ride request data');
// //       return;
// //     }
    
// //     setShowRideRequestModal(false);
    
// //     try {
// //       setIsLoading(true);
      
// //       // Call the decline ride API endpoint
// //       const response = await fetch(`${API_URL}/rides/${rideId}/decline`, {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //         },
// //         body: JSON.stringify({
// //           reason: 'Driver declined',
// //         }),
// //       });

// //       if (!response.ok) {
// //         throw new Error('Failed to decline ride');
// //       }

// //       const result = await response.json();
// //       logger.info('Ride declined successfully:', result);

// //       // DECREMENT BADGE after declining
// //       await FloatingBubbleService.decrementBadge();

// //       // Emit socket event for real-time updates
// //       await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.DECLINE, { 
// //         rideId, 
// //         reason: 'Driver declined' 
// //       });
      
// //       logger.info(`Ride declined by ${currentRideRequest.userType}`);
      
// //       // Clear the current request
// //       setCurrentRideRequest(null);
      
// //     } catch (error) {
// //       logger.error('Error declining ride:', error);
      
// //       // Still clear the request even if API fails
// //       setCurrentRideRequest(null);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };
// //    const fetchPendingRideRequest = async () => {
// //       try {
// //         const { deviceId } = await getDeviceInfo();
// //         const response = await fetch(`${API_URL}/devices/pending-ride/${deviceId}`);
// //         const result = await response.json();
// //         if (result.success && result.data && result.data.length > 0) {
// //           // Use the first pending ride (or handle multiple)
// //           const pendingRide = result.data[0];
// //           // Transform to match the modal's expected shape
// //           const rideData = {
// //             rideId: pendingRide.rideId,
// //             rideCode: pendingRide.rideCode,
// //             riderName: pendingRide.rider?.name,
// //             rider: {
// //               name: pendingRide.rider?.name,
// //               // rating and totalRides might not be available; set defaults
// //               rating: 5.0,
// //               totalRides: 0,
// //             },
// //             pickupLocation: pendingRide.pickupLocation,
// //             dropoffLocation: pendingRide.dropoffLocation,
// //             distance: pendingRide.distance,
// //             estimatedFare: pendingRide.estimatedFare,
// //           };
// //           // const urls = await getFrontendUrls();
// //           // // ${urls['okra-rider-app']}
// //           // //alert(frontendNameRef.current)
// //           // webViewRef.current?.injectJavaScript(`
// //           //        window.location.href = ${urls["okra-driver-app"]}
// //           //       `)
// //                 // window.location.href = "${urls['okra-rider-app']}/finding-driver?rideId=${ride.id}";
// //           setCurrentRideRequest(rideData);
// //           //setShowRideRequestModal(true);
// //           //setUserHasRideRequest(true);
// //         }
// //       } catch (error) {
// //         logger.error('Error fetching pending ride request:', error);
// //       }
// //     }

// //     const normalizeRideRequest = (raw: any): any => {
// //       // Ensure pickupLocation has address, lat, lng
// //       const pickup = raw.pickupLocation || raw.pickup || {};
// //       const dropoff = raw.dropoffLocation || raw.dropoff || {};

// //       return {
// //         rideId: raw.rideId || raw.id,
// //         rideCode: raw.rideCode || `RIDE-${raw.rideId || raw.id}`,
// //         riderName: raw.riderName || raw.rider?.name,
// //         rider: {
// //           name: raw.riderName || raw.rider?.name || 'Rider',
// //           rating: raw.rider?.rating || 5.0,
// //           totalRides: raw.rider?.totalRides || 0,
// //         },
// //         pickupLocation: {
// //           address: pickup.address || raw.pickupAddress || 'Pickup location',
// //           lat: pickup.lat || 0,
// //           lng: pickup.lng || 0,
// //           name: pickup.name,
// //         },
// //         dropoffLocation: {
// //           address: dropoff.address || raw.dropoffAddress || 'Dropoff location',
// //           lat: dropoff.lat || 0,
// //           lng: dropoff.lng || 0,
// //           name: dropoff.name,
// //         },
// //         distance: raw.distance || 0,
// //         estimatedFare: raw.estimatedFare || raw.fare || 0,
// //       };
// //     };

// //   useEffect(() => {
// //      alert(currentRideRequest)
// //   }, [currentRideRequest]);
// // // Initialize notification service on mount
// //   useEffect(() => {
// //     const initNotifications = async () => {
// //       await NotificationService.initialize(sendToWebView);
// //     };

// //     initNotifications();

// //     return () => {
// //       NotificationService.cleanup();
// //     };
// //   }, [sendToWebView]);

// //   // Listen for notification responses (Accept/Decline buttons)
// //   useEffect(() => {
// //     const subscription = Notifications.addNotificationResponseReceivedListener(response => {
// //       logger.info('📨 Notification response received:', response);

// //       const { actionIdentifier, notification } = response;
// //       const data = notification.request.content.data;
    
// //       if (data.type === 'ride_request') {
// //         if (actionIdentifier === 'accept') {
// //           logger.info('✅ User accepted ride from notification:', data.rideId);
          
// //           // Set current ride request and accept
// //           setCurrentRideRequest(data);
// //           handleAcceptRide(String(data.rideId));
          
// //         } else if (actionIdentifier === 'decline') {
// //           logger.info('❌ User declined ride from notification:', data.rideId);
          
// //           // Set current ride request and decline
// //           setCurrentRideRequest(data);
// //           handleDeclineRide(String(data.rideId));
          
// //         } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
// //           // User tapped the notification (not a button)
// //           logger.info('👆 User tapped notification:', data.rideId);
          
// //           // Show the modal with ride details
// //           setCurrentRideRequest(data);
// //           setShowRideRequestModal(true);
// //         }
// //       }
// //     });

// //     return () => subscription.remove();
// //   }, []);

// //   // Monitor network connectivity
// //   useEffect(() => {
// //     const handleActiveRide = async () => {
// //       try {
// //         const { deviceId } = await getDeviceInfo();
// //         console.log('rides API_URL', API_URL)
// //         const rideResponse = await fetch(`${API_URL}/devices/activeride/${deviceId}`);
// //         console.log("Response received:", rideResponse.status);
        
// //         if (!rideResponse.ok) {
// //           throw new Error('Failed to fetch URLs')
// //         }
        
// //         const rideRes = await rideResponse.json();
// //         console.log('rides-ridesResponse', rideRes)
        
// //         if (rideRes.data) {
// //           const urls = await getFrontendUrls();
          
// //           if (typeof window !== "undefined" && rideRes?.success) {
// //             const ride = rideRes?.data // get actual active ride itself
            
// //             if (rideRes.userRole === "rider") {
// //               if (ride.rideStatus === 'pending') {
// //                 webViewRef.current?.injectJavaScript(`
// //                   window.location.href = "${urls['okra-rider-app']}/finding-driver?rideId=${ride.id}";
// //                 `)
// //               } else if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// //                 webViewRef.current?.injectJavaScript(`
// //                   window.location.href = "${urls['okra-rider-app']}/tracking?rideId=${ride.id}";
// //                 `)
// //               }
// //             } else if (rideRes.userRole === "driver") {
// //               if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// //                 webViewRef.current?.injectJavaScript(`
// //                   window.location.href = "${urls['okra-driver-app']}/active-ride/${ride.id}";
// //                 `)
// //               }
// //             } else if (rideRes.userRole === "delivery") {
// //               if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// //                 webViewRef.current?.injectJavaScript(`
// //                   window.location.href = "${urls['okra-delivery-app']}/active-ride/${ride.id}";
// //                 `)
// //               }
// //             } else if (rideRes.userRole === "conductor") {
// //               if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
// //                 webViewRef.current?.injectJavaScript(`
// //                   window.location.href = "${urls['okra-conductor-app']}/active-ride/${ride.id}";
// //                 `)
// //               }
// //             }
// //           }
// //         }
// //       } catch (error) {
// //         logger.error('Error handling active ride:', error);
// //       }
// //     }
 
// //     handleActiveRide()
// //     fetchPendingRideRequest()

// //     const unsubscribe = NetInfo.addEventListener(state => {
// //       setIsConnected(state.isConnected ?? false);
      
// //       if (state.isConnected && servicesInitialized) {
// //         // Reconnect socket if disconnected
// //         if (!DeviceSocketService.isConnected()) {
// //           logger.info('Network restored, reconnecting socket...');
// //           DeviceSocketService.reconnect();
// //         }
// //       }
// //     });

// //     return () => unsubscribe();
// //   }, [servicesInitialized]);
 
// //   // Handle App State Changes
// //   useEffect(() => {
// //     const subscription = AppState.addEventListener('change', async (nextAppState) => {
// //       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

// //       if (appState.match(/inactive|background/) && nextAppState === 'active') {
// //         // App came to foreground
// //         fetchPendingRideRequest()
// //         logger.info('App resumed to foreground');
// //         console.log("isOnlineRef.current",isOnlineRef.current)
// //         if (await FloatingBubbleService.isShowing()) {
// //           console.log('yes bubble')
// //           await FloatingBubbleService.stop();
// //         }
// //         // Check socket connection health
// //         if (servicesInitialized && !DeviceSocketService.isConnected()) {
// //           logger.warn('Socket disconnected, attempting reconnect');
// //           await DeviceSocketService.reconnect();
// //         }

// //         // Notify WebView
// //         sendToWebView({ type: WEBVIEW_EVENTS.APP_RESUMED, payload: {} });
// //       } else if (nextAppState === 'background') {
// //         logger.info('App moved to background');
// //         // App came to foreground → hide bubble
// //         await FloatingBubbleService.start();

// //         // Ensure background service is running (Android)
// //         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
// //           await BackgroundService.ensureForegroundService();
// //         }
// //       }

// //       setAppState(nextAppState);
// //     });

// //     return () => subscription.remove();
// //   }, [appState, servicesInitialized, sendToWebView]);


// //   // Setup Socket Listeners (called after initialization)
// //   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
// //     logger.info(`Setting up socket listeners for ${frontendName}`);

// //     // ==================== CORE DEVICE EVENTS ====================
    
// //     // Listen for location requests from backend
// //     DeviceSocketService.on(SOCKET_EVENTS.CONNECTION.GET_CURRENT_LOCATION, async () => {
// //       console.log('socketlog- getCurrentLocation: Backend requested current location');
// //       logger.info('Received location request from backend via socket');
// //       try {
// //         const location = await LocationService.getCurrentLocation();
// //         if (location) {
// //           sendToWebView({
// //             type: WEBVIEW_EVENTS.LOCATION_UPDATE,
// //             payload: {
// //               lat: location.coords.latitude,
// //               lng: location.coords.longitude,
// //               accuracy: location.coords.accuracy,
// //               heading: location.coords.heading,
// //               speed: location.coords.speed,
// //             },
// //           });
// //         }
// //       } catch (error) {
// //         logger.error('Error getting location on request:', error);
// //       }
// //     });

// //     // Listen for notifications
// //     DeviceSocketService.on('showNotification', async (notification: any) => {
// //       console.log('socketlog- showNotification:', JSON.stringify(notification, null, 2));
// //       logger.info('Received notification request:', notification.type);
// //       await NotificationService.show(notification);

// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.NOTIFICATION_RECEIVED,
// //         payload: notification,
// //       });
// //     });

// //     // Listen for draw-over requests (Android only, non-rider)
// //     if (Platform.OS === 'android' && frontendName !== 'rider') {
// //       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
// //         console.log('socketlog- showDrawOver:', JSON.stringify(overlayData, null, 2));
// //         logger.info('Received draw-over request');

// //         if (overlayData.shouldDrawOver === false) {
// //           logger.info('shouldDrawOver is false, skipping overlay - showing notification instead');
          
// //           // INCREMENT BADGE AND SHOW RIPPLE
// //           await FloatingBubbleService.incrementBadge();
// //           await FloatingBubbleService.showRipple();
          
// //           // Use the new showRideRequest method
// //           await NotificationService.showRideRequest({
// //             rideId: overlayData.rideId,
// //             rideCode: overlayData.rideCode,
// //             riderName: overlayData.riderName,
// //             pickupAddress: overlayData.pickupLocation?.address || overlayData.pickupAddress || 'Pickup',
// //             dropoffAddress: overlayData.dropoffLocation?.address || overlayData.dropoffAddress || 'Dropoff',
// //             estimatedFare: overlayData.estimatedFare || 0,
// //             distance: overlayData.distance || 0,
// //             pickupLocation: overlayData.pickupLocation,
// //             dropoffLocation: overlayData.dropoffLocation,
// //           });
          
// //           sendToWebView({
// //             type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW,
// //             payload: overlayData,
// //           });
          
// //           return;
// //         }

// //         await AudioService.playAlert("ride_request");

// //         // INCREMENT BADGE AND SHOW RIPPLE
// //         await FloatingBubbleService.incrementBadge();
// //         await FloatingBubbleService.showRipple();

// //         const hasPermission = await PermissionManager.checkDrawOverPermission();
// //         if (hasPermission) {
// //           await BackgroundService.showRideRequest(overlayData);
// //         }

// //         // Use the new showRideRequest method
// //         await NotificationService.showRideRequest({
// //           rideId: overlayData.rideId,
// //           rideCode: overlayData.rideCode,
// //           riderName: overlayData.riderName,
// //           pickupAddress: overlayData.pickupLocation?.address || overlayData.pickupAddress || 'Pickup',
// //           dropoffAddress: overlayData.dropoffLocation?.address || overlayData.dropoffAddress || 'Dropoff',
// //           estimatedFare: overlayData.estimatedFare || 0,
// //           distance: overlayData.distance || 0,
// //           pickupLocation: overlayData.pickupLocation,
// //           dropoffLocation: overlayData.dropoffLocation,
// //         });

// //         sendToWebView({
// //           type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW,
// //           payload: overlayData,
// //         });
// //       });
// //     }

// //     // ==================== RIDE LIFECYCLE EVENTS (RIDER-FOCUSED) ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_CREATED, (data: any) => {
// //       console.log('socketlog- ride:request:created:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_REQUEST_CREATED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_NEW, async (data: any) => {
// //       console.log('socketlog- ride:request:new:', JSON.stringify(data, null, 2));
      
// //       await AudioService.playAlert('ride_request');
      
// //       // INCREMENT BADGE AND SHOW RIPPLE
// //       await FloatingBubbleService.incrementBadge();
// //       await FloatingBubbleService.showRipple();
// //       //fetchPendingRideRequest()
// //       setCurrentRideRequest(data)
// //       //setUserHasRideRequest(true)
// //       setShowRideRequestModal(true)
      
// //       // Use the new showRideRequest method with proper data transformation
// //       await NotificationService.showRideRequest({
// //         rideId: data.rideId,
// //         rideCode: data.rideCode,
// //         riderName: data.riderName,
// //         pickupAddress: data.pickupLocation?.address || data.pickupAddress || 'Pickup',
// //         dropoffAddress: data.dropoffLocation?.address || data.dropoffAddress || 'Dropoff',
// //         estimatedFare: data.estimatedFare || 0,
// //         distance: data.distance || 0,
// //         pickupLocation: data.pickupLocation,
// //         dropoffLocation: data.dropoffLocation,
// //       });
      
// //       const hasPermission = await PermissionManager.checkDrawOverPermission();
// //       if (hasPermission) {
// //         await BackgroundService.showRideRequest(data);
// //       }

// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_RECEIVED, async (data: any) => {
// //       console.log('socketlog- ride:request:received:', data);
      
// //       await AudioService.playAlert('ride_request');
      
// //       // INCREMENT BADGE AND SHOW RIPPLE
// //       await FloatingBubbleService.incrementBadge();
// //       await FloatingBubbleService.showRipple();
// //       forceUpdate();
// //         // const urls = await getFrontendUrls();
// //         //   // ${urls['okra-rider-app']}
// //         //   //alert(frontendNameRef.current)
// //         //   webViewRef.current?.injectJavaScript(`
// //         //          window.location.href = ${urls["okra-driver-app"]}
// //         //         `)
// //      //window.location.href = ${urls["okra-driver-app"]}
// //       //fetchPendingRideRequest()
// //       const normalized = normalizeRideRequest(data)
// //       setCurrentRideRequest(normalized)
// //       // unstable_batchedUpdates(() => {
// //       //   setUserHasRideRequest(true)
// //       //   setShowRideRequestModal(true)
// //       // })

      
// //       // Use the new showRideRequest method with proper data transformation
// //       await NotificationService.showRideRequest({
// //         rideId: data.rideId,
// //         rideCode: data.rideCode,
// //         riderName: data.riderName,
// //         pickupAddress: data.pickupLocation?.address || data.pickupAddress || 'Pickup',
// //         dropoffAddress: data.dropoffLocation?.address || data.dropoffAddress || 'Dropoff',
// //         estimatedFare: data.estimatedFare || 0,
// //         distance: data.distance || 0,
// //         pickupLocation: data.pickupLocation,
// //         dropoffLocation: data.dropoffLocation,
// //       });
      
// //       const hasPermission = await PermissionManager.checkDrawOverPermission();
// //       if (hasPermission) {
// //         await BackgroundService.showRideRequest(data);
// //       }

// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_REQUEST_RECEIVED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPTED, async (data: any) => {
// //       console.log('socketlog- ride:accepted:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Ride Accepted',
// //         body: 'Your driver has accepted the ride request',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_ACCEPTED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TAKEN, (data: any) => {
// //       console.log('socketlog- ride:taken:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_TAKEN,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ARRIVED, async (data: any) => {
// //       console.log('socketlog- ride:driver:arrived:', JSON.stringify(data, null, 2));
      
// //       await AudioService.playAlert('driver_arrived');
      
// //       await NotificationService.showHighPriority({
// //         title: 'Driver Arrived',
// //         body: 'Your driver is waiting for you',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_ARRIVED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_STARTED, async (data: any) => {
// //       console.log('socketlog- ride:trip:started:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Trip Started',
// //         body: 'Your trip has begun. Safe travels!',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.TRIP_STARTED,
// //         payload: data,
// //       });
// //     })

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_COMPLETED, async (data: any) => {
// //       console.log('socketlog- ride:trip:completed:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Trip Completed',
// //         body: `Fare: K${data.finalFare?.toFixed(2) || 0}`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.TRIP_COMPLETED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.CANCELLED, async (data: any) => {
// //       console.log('socketlog- ride:cancelled:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Ride Cancelled',
// //         body: data.reason || 'The ride has been cancelled',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_CANCELLED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPT_SUCCESS, (data: any) => {
// //       console.log('socketlog- ride:accept:success:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_ACCEPT_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDE.DECLINE_SUCCESS, (data: any) => {
// //       console.log('socketlog- ride:decline:success:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDE_DECLINE_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     // ==================== LOCATION EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.LOCATION_UPDATED, (data: any) => {
// //       console.log('socketlog- driver:location:updated: Driver location update received');
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_LOCATION_UPDATED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RIDER.LOCATION_UPDATED, (data: any) => {
// //       console.log('socketlog- rider:location:updated: Rider location update received');
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RIDER_LOCATION_UPDATED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== DRIVER AVAILABILITY EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ONLINE_SUCCESS, (data: any) => {
// //       console.log('socketlog- driver:online:success:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_ONLINE_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.OFFLINE_SUCCESS, (data: any) => {
// //       console.log('socketlog- driver:offline:success:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_OFFLINE_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.FORCED_OFFLINE, async (data: any) => {
// //       console.log('socketlog- driver:forced:offline:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.showHighPriority({
// //         title: 'Account Status',
// //         body: data.message || 'You have been taken offline',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.DRIVER_FORCED_OFFLINE,
// //         payload: data,
// //       });
// //     });

// //     // ==================== SUBSCRIPTION EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRING_WARNING, async (data: any) => {
// //       console.log('socketlog- subscription:expiring:warning:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Subscription Expiring Soon',
// //         body: `Your ${data.planName} plan expires in ${data.daysRemaining} days`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRING,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRED, async (data: any) => {
// //       console.log('socketlog- subscription:expired:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.showHighPriority({
// //         title: 'Subscription Expired',
// //         body: data.message || 'Your subscription has expired',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.ACTIVATED, async (data: any) => {
// //       console.log('socketlog- subscription:activated:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Subscription Activated',
// //         body: `Your ${data.planName} plan is now active`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SUBSCRIPTION_ACTIVATED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== PAYMENT EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.SUCCESS, async (data: any) => {
// //       console.log('socketlog- payment:success:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Payment Successful',
// //         body: `K${data.amount?.toFixed(2) || 0} - ${data.type}`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.PAYMENT_SUCCESS,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.FAILED, async (data: any) => {
// //       console.log('socketlog- payment:failed:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Payment Failed',
// //         body: data.reason || 'Your payment could not be processed',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.PAYMENT_FAILED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.WITHDRAWAL.PROCESSED, async (data: any) => {
// //       console.log('socketlog- withdrawal:processed:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Withdrawal Processed',
// //         body: `K${data.amount?.toFixed(2) || 0} via ${data.method}`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.WITHDRAWAL_PROCESSED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== RATING EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.RATING.REQUEST, async (data: any) => {
// //       console.log('socketlog- rating:request:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Rate Your Experience',
// //         body: `Please rate your ${data.ratingType || 'recent'} trip`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RATING_REQUEST,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.RATING.SUBMITTED, (data: any) => {
// //       console.log('socketlog- rating:submitted:', JSON.stringify(data, null, 2));
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.RATING_SUBMITTED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== NOTIFICATION EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.NEW, async (data: any) => {
// //       console.log('socketlog- notification:new:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show(data);
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.NOTIFICATION_NEW,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.BROADCAST, async (data: any) => {
// //       console.log('socketlog- notification:broadcast:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: data.title || 'Announcement',
// //         body: data.message || data.body,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.NOTIFICATION_BROADCAST,
// //         payload: data,
// //       });
// //     });

// //     // ==================== SOS & EMERGENCY EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.SOS.TRIGGERED, async (data: any) => {
// //       console.log('socketlog- sos:triggered:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.showHighPriority({
// //         title: 'SOS Alert Sent',
// //         body: 'Emergency services have been notified',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SOS_TRIGGERED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.SOS.ACKNOWLEDGED, async (data: any) => {
// //       console.log('socketlog- sos:acknowledged:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'SOS Acknowledged',
// //         body: `Your alert has been acknowledged by ${data.acknowledgedBy}`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SOS_ACKNOWLEDGED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== AFFILIATE EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.REFERRAL_SIGNUP, async (data: any) => {
// //       console.log('socketlog- affiliate:referral:signup:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Referral Signup',
// //         body: `${data.referredUser} signed up! +${data.points} points`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.AFFILIATE_REFERRAL_SIGNUP,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.COMMISSION_EARNED, async (data: any) => {
// //       console.log('socketlog- affiliate:commission:earned:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Commission Earned',
// //         body: `K${data.amount?.toFixed(2) || 0} commission earned`,
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.AFFILIATE_COMMISSION_EARNED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== SYSTEM EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.SYSTEM.ANNOUNCEMENT, async (data: any) => {
// //       console.log('socketlog- system:announcement:', JSON.stringify(data, null, 2));
      
// //       if (data.priority === 'high' || data.priority === 'urgent') {
// //         await NotificationService.showHighPriority({
// //           title: 'Important Announcement',
// //           body: data.message,
// //           data,
// //         });
// //       } else {
// //         await NotificationService.show({
// //           title: 'Announcement',
// //           body: data.message,
// //           data,
// //         });
// //       }
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SYSTEM_ANNOUNCEMENT,
// //         payload: data,
// //       });
// //     });

// //     // ==================== SESSION EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.RIDER.SESSION_REPLACED, async (data: any) => {
// //       console.log('socketlog- rider:session-replaced:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Session Replaced',
// //         body: data.message || 'You have logged in on another device',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SESSION_REPLACED,
// //         payload: data,
// //       });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.SESSION_REPLACED, async (data: any) => {
// //       console.log('socketlog- driver:session-replaced:', JSON.stringify(data, null, 2));
      
// //       await NotificationService.show({
// //         title: 'Session Replaced',
// //         body: data.message || 'You have logged in on another device',
// //         data,
// //       });
      
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SESSION_REPLACED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== CONNECTION STATUS EVENTS ====================
    
// //     DeviceSocketService.on(SOCKET_EVENTS.CONNECTED, () => {
// //       console.log('socketlog- connected: Socket connection established');
// //       logger.info('Device socket connected');
// //       sendToWebView({ type: WEBVIEW_EVENTS.SOCKET_CONNECTED, payload: {} });
// //     });

// //     DeviceSocketService.on(SOCKET_EVENTS.DISCONNECTED, (data: any) => {
// //       console.log('socketlog- disconnected:', JSON.stringify(data, null, 2));
// //       logger.warn('Device socket disconnected:', data.reason);
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SOCKET_DISCONNECTED,
// //         payload: data,
// //       });
// //     });

// //     // ==================== ERROR EVENTS ====================
    
// //     DeviceSocketService.on('socket_error', (data: any) => {
// //       console.log('socketlog- socket_error:', JSON.stringify(data, null, 2));
// //       logger.error('Socket error received:', data);
// //       sendToWebView({
// //         type: WEBVIEW_EVENTS.SOCKET_ERROR,
// //         payload: data,
// //       });
// //     });

// //     logger.info('✅ All socket event listeners registered');
// //   }, [sendToWebView]);

// //   // Handle messages from WebView
// //   const onMessage = async (event: any) => {
// //     try {
// //       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
// //       const { type, requestId, payload } = message;

// //       logger.info(`Received message from WebView: ${type}${requestId ? ` (requestId: ${requestId})` : ''}`);

// //       let response: any = null;

// //       switch (type) {
// //         case 'INITIALIZE_SERVICES':
// //           response = await handleInitializeServices(payload);
// //           break;
// //         case 'LOG_DATA':
// //           response = await handleLogDataFromWebView(payload);
// //           break;

// //         case 'REQUEST_PERMISSION':
// //           response = await handleRequestPermission(payload);
// //           break;

// //         case 'CHECK_PERMISSION':
// //           response = await handleCheckPermission(payload);
// //           break;

// //         case 'GET_CURRENT_LOCATION':
// //           response = await handleGetCurrentLocation();
// //           break;

// //         case 'START_LOCATION_TRACKING':
// //           response = await handleStartLocationTracking(payload);
// //           break;

// //         case 'STOP_LOCATION_TRACKING':
// //           response = await handleStopLocationTracking();
// //           break;

// //         case 'SHOW_NOTIFICATION':
// //           response = await handleShowNotification(payload);
// //           break;

// //         case 'PLAY_AUDIO':
// //           response = await handlePlayAudio(payload);
// //           break;

// //         case 'GO_ONLINE':
// //           response = await handleGoOnline(payload);
// //           break;

// //         case 'GO_OFFLINE':
// //           response = await handleGoOffline(payload);
// //           break;

// //         default:
// //           logger.warn(`Unknown message type: ${type}`);
// //           response = { error: 'Unknown message type' };
// //       }

// //       // Send response back to WebView if requestId provided
// //       if (requestId) {
// //         const messageToSend = {
// //           type: type,
// //           requestId,
// //           payload: response?.error ? null : response,
// //           error: response?.error || undefined
// //         };
        
// //         logger.info(`Sending response back to WebView for ${type}`, messageToSend);
        
// //         if (webViewRef.current) {
// //           webViewRef.current.postMessage(JSON.stringify(messageToSend));
// //         }
// //       }
// //     } catch (error: any) {
// //       logger.error('Error handling WebView message:', error);

// //       // Send error response
// //       try {
// //         const { requestId, type } = JSON.parse(event.nativeEvent.data);
// //         if (requestId && webViewRef.current) {
// //           webViewRef.current.postMessage(JSON.stringify({
// //             type: type,
// //             requestId,
// //             payload: null,
// //             error: error.message
// //           }));
// //         }
// //       } catch {}
// //     }
// //   };

// //   // Initialize Services (called after user authentication)
// //   const handleInitializeServices = async (payload: any) => {
// //     try {
// //       const { userId, frontendName, socketServerUrl } = payload;

// //       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

// //       if (servicesInitialized) {
// //         logger.warn('Services already initialized');
// //         return { success: true, reason: 'already_initialized' };
// //       }

// //       const deviceInfo = await getDeviceInfo();
// //       const deviceId = deviceInfo.deviceId;
// //       deviceIdRef.current = deviceId;
// //       userIdRef.current = userId;
// //       frontendNameRef.current = frontendName;
      
// //       LocationService.setDeviceId(deviceId);

// //       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

// //       if (!permissionsGranted.location) {
// //         logger.error('Location permission denied - cannot initialize');
// //         return {
// //           success: false,
// //           error: 'Location permission required',
// //           permissions: permissionsGranted,
// //         };
// //       }

// //       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
// //       const servicesStarted = await BackgroundService.start({
// //         deviceId,
// //         userId,
// //         frontendName,
// //         socketServerUrl: socketUrl,
// //       });

// //       if (!servicesStarted) {
// //         logger.error('Failed to start background services');
// //         return {
// //           success: false,
// //           error: 'Failed to start services',
// //         };
// //       }

// //       setupSocketListeners(deviceId, frontendName);

// //       setServicesInitialized(true);
// //       logger.info('✅ Services initialized successfully');

// //       return {
// //         success: true,
// //         deviceId,
// //         permissions: permissionsGranted,
// //         socketConnected: DeviceSocketService.isConnected(),
// //       };
// //     } catch (error: any) {
// //       logger.error('Error initializing services:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Request Permission
// //   const handleRequestPermission = async (payload: any) => {
// //     const { permissionType } = payload;
// //     logger.info(`Requesting permission: ${permissionType}`);

// //     try {
// //       const status = await PermissionManager.request(permissionType);
// //       return { status };
// //     } catch (error: any) {
// //       logger.error(`Error requesting ${permissionType}:`, error);
// //       return { status: 'denied', error: error.message };
// //     }
// //   };

// //   // Check Permission
// //   const handleCheckPermission = async (payload: any) => {
// //     const { permissionType } = payload;
// //     const status = await PermissionManager.check(permissionType);
// //     return { status };
// //   };

// //   // Log from WebView
// //   const handleLogDataFromWebView = async (payload: any) => {
// //     console.log('Log from webview', payload);
// //     return { success: true };
// //   };

// //   // Get Current Location
// //   const handleGetCurrentLocation = async () => {
// //     try {
// //       logger.info('Getting current location...');
// //       const location = await LocationService.getCurrentLocation();
      
// //       if (!location) {
// //         logger.warn('Could not get location');
// //         return { error: 'Could not get location' };
// //       }

// //       return location;
// //     } catch (error: any) {
// //       logger.error('Error getting location:', error);
// //       return { error: error.message };
// //     }
// //   };

// //   // Start Location Tracking
// //   const handleStartLocationTracking = async (payload: any) => {
// //     try {
// //       if (!deviceIdRef.current) {
// //         throw new Error('Device not initialized');
// //       }

// //       const success = await LocationService.startPersistentTracking(deviceIdRef.current);
      
// //       if (success) {
// //         logger.info('Location tracking started successfully');
// //       }
      
// //       return { success };
// //     } catch (error: any) {
// //       logger.error('Error starting location tracking:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Stop Location Tracking
// //   const handleStopLocationTracking = async () => {
// //     try {
// //       await LocationService.stopPersistentTracking();
// //       logger.info('Location tracking stopped successfully');
// //       return { success: true };
// //     } catch (error: any) {
// //       logger.error('Error stopping location tracking:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Show Notification
// //   const handleShowNotification = async (payload: any) => {
// //     try {
// //       await NotificationService.show(payload);
// //       return { success: true };
// //     } catch (error: any) {
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Play Audio
// //   const handlePlayAudio = async (payload: any) => {
// //     const { soundFile } = payload;
// //     try {
// //       await AudioService.playAlert(soundFile);
// //       return { success: true };
// //     } catch (error: any) {
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Go Online (Driver)
// //   const handleGoOnline = async (payload: any) => {
// //     try {
// //       const location = await LocationService.getCurrentLocation();

// //       if (!location) {
// //         throw new Error('Cannot get current location');
// //       }

// //       await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.ONLINE, {
// //         driverId: userIdRef.current,
// //         location: {
// //           lat: location.coords.latitude,
// //           lng: location.coords.longitude,
// //         },
// //       });

// //       if (deviceIdRef.current) {
// //         const trackingStarted = await LocationService.startPersistentTracking(deviceIdRef.current);
// //         if (trackingStarted) {
// //           isOnlineRef.current = true;
          
// //           // ✅ START FLOATING BUBBLE when going online
// //           await FloatingBubbleService.start();
          
// //           logger.info('Location tracking started when going online');
// //         } else {
// //           logger.warn('Failed to start location tracking when going online');
// //         }
// //       }

// //       return {
// //         success: true,
// //         location: {
// //           lat: location.coords.latitude,
// //           lng: location.coords.longitude,
// //         },
// //       };
// //     } catch (error: any) {
// //       logger.error('Error going online:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Go Offline (Driver)
// //   const handleGoOffline = async (payload: any) => {
// //     try {
// //       await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.OFFLINE, {
// //         driverId: userIdRef.current,
// //       });

// //       if (isOnlineRef.current) {
// //         await LocationService.stopPersistentTracking();
        
// //         // ✅ STOP FLOATING BUBBLE when going offline
// //         await FloatingBubbleService.stop();
        
// //         isOnlineRef.current = false;
// //         logger.info('Location tracking stopped when going offline');
// //       }

// //       return { success: true };
// //     } catch (error: any) {
// //       logger.error('Error going offline:', error);
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // WebView error handler
// //   const handleWebViewError = (syntheticEvent: any) => {
// //     const { nativeEvent } = syntheticEvent;
// //     logger.error('WebView error:', nativeEvent);
// //     setHasError(true);
// //   };

// //   // WebView load end handler
// //   const handleLoadEnd = () => {
// //     logger.info('loading ended');
// //     setIsLoading(false);
// //   };

 

// //   // Render error state
// //   if (hasError) {
// //     return (
// //       <View style={styles.errorContainer}>
// //         <Text style={styles.errorTitle}>😔 Oops!</Text>
// //         <Text style={styles.errorText}>
// //           Something went wrong loading the app.
// //         </Text>
// //         <Text style={styles.errorSubtext}>
// //           Please check your internet connection and try again.
// //         </Text>
// //       </View>
// //     );
// //   }

// //   // Render offline state
// //   if (!isConnected) {
// //     return (
// //       <View style={styles.offlineContainer}>
// //         <Text style={styles.offlineTitle}>📡 No Connection</Text>
// //         <Text style={styles.offlineText}>
// //           You're currently offline. Please check your internet connection.
// //         </Text>
// //       </View>
// //     );
// //   }

// //   return (
// //     <SafeAreaView style={styles.container}>
// //       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
// //       <WebView
// //         ref={webViewRef}
// //         source={{ uri: FRONTEND_URL }}
// //         onMessage={onMessage}
// //         javaScriptEnabled={true}
// //         domStorageEnabled={true}
// //         geolocationEnabled={true}
// //         startInLoadingState={true}
// //         originWhitelist={['*']}
// //         allowsInlineMediaPlayback={true}
// //         mediaPlaybackRequiresUserAction={false}
// //         style={styles.webview}
// //         onError={handleWebViewError}
// //         onLoadEnd={handleLoadEnd}
// //         onHttpError={(syntheticEvent) => {
// //           const { nativeEvent } = syntheticEvent;
// //           logger.error('WebView HTTP error:', nativeEvent.statusCode);
// //         }}
// //         cacheEnabled={true}
// //         cacheMode="LOAD_DEFAULT"
// //         mixedContentMode="always"
// //         allowFileAccess={false}
// //         allowUniversalAccessFromFileURLs={false}
// //       />
      
// //       {/* Ride Request Modal */}
// //       <RideRequestModal
// //         open={showRideRequestModal}
// //         rideRequest={currentRideRequest}
// //         onAccept={handleAcceptRide}
// //         onDecline={handleDeclineRide}
// //       />
// //     </SafeAreaView>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: '#FFFFFF',
// //   },
// //   webview: {
// //     flex: 1,
// //   },
// //   loadingContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     backgroundColor: '#FFFFFF',
// //   },
// //   loadingText: {
// //     marginTop: 16,
// //     fontSize: 16,
// //     color: '#666666',
// //   },
// //   errorContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     backgroundColor: '#FFFFFF',
// //     padding: 24,
// //   },
// //   errorTitle: {
// //     fontSize: 48,
// //     marginBottom: 16,
// //   },
// //   errorText: {
// //     fontSize: 18,
// //     fontWeight: '600',
// //     color: '#1A1A1A',
// //     textAlign: 'center',
// //     marginBottom: 8,
// //   },
// //   errorSubtext: {
// //     fontSize: 14,
// //     color: '#666666',
// //     textAlign: 'center',
// //   },
// //   offlineContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     backgroundColor: '#FFFFFF',
// //     padding: 24,
// //   },
// //   offlineTitle: {
// //     fontSize: 48,
// //     marginBottom: 16,
// //   },
// //   offlineText: {
// //     fontSize: 16,
// //     color: '#666666',
// //     textAlign: 'center',
// //   },
// // });
// import React, { useRef, useEffect, useState, useCallback, useReducer } from 'react';
// import {
//   StatusBar,
//   Platform,
//   AppState,
//   StyleSheet,
//   View,
//   Text,
//   ActivityIndicator,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { WebView } from 'react-native-webview';
// import * as Notifications from 'expo-notifications';
// import * as TaskManager from 'expo-task-manager';
// import NetInfo from '@react-native-community/netinfo';

// import FloatingBubbleService from './src/services/FloatingBubbleService';
// import BackgroundService from './src/services/BackgroundService';
// import DeviceSocketService from './src/services/DeviceSocketService';
// import LocationService from './src/services/LocationService';
// import NotificationService from './src/services/NotificationService';
// import PermissionManager from './src/services/PermissionManager';
// import AudioService from './src/services/AudioService';
// import DeepLinkService from './src/services/DeepLinkService';
// import { getDeviceInfo } from './src/utils/device-info';
// import { logger } from './src/utils/logger';
// import { NavigationHelper } from './src/utils/navigation';
// import { SOCKET_EVENTS, WEBVIEW_EVENTS, CONSTANTS } from './src/utils/constants';
// import type { WebViewMessage } from './src/types/messages';
// import OkraSkeletonLoader from '@components/OkraSkeletonLoader';
// import { RideRequestModal } from './src/components/RideRequestModal';

// // Define background notification task
// TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
//   if (error) {
//     logger.error('Background notification task error:', error);
//     return;
//   }

//   if (data) {
//     await NotificationService.handleBackgroundNotification(data);
//   }
// });

// const API_URL = CONSTANTS.BACKEND_URL;
// const FRONTEND_URL = __DEV__
//   ? Platform.OS === 'android'
//     ? 'http://10.64.246.23:3000/' // Android emulator
//     : 'http://10.64.246.23:3000'  // iOS simulator
//   : CONSTANTS.FRONTEND_URLS.landing;

// // helper function to get frontend URLs
// const getFrontendUrls = async () => {
//   try {
//     const response = await fetch(`${API_URL}/frontend-url`);
//     if (!response.ok) {
//       throw new Error('Failed to fetch URLs');
//     }
//     const res = await response.json();
//     return res?.data?.paths || {};
//   } catch (error) {
//     logger.error('Error fetching frontend URLs:', error);
//     return {};
//   }
// };

// export default function App() {
//   const webViewRef = useRef<WebView>(null);
//   const [appState, setAppState] = useState(AppState.currentState);
//   const [servicesInitialized, setServicesInitialized] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [hasError, setHasError] = useState(false);
//   const [isConnected, setIsConnected] = useState(true);
//   const deviceIdRef = useRef<string | null>(null);
//   const userIdRef = useRef<string | number | null>(null);
//   const frontendNameRef = useRef<string | null>(null);
//   const isOnlineRef = useRef<boolean>(false);

//   // ─── Refs-based modal state (avoids stale closure issues from socket handlers) ───
//   const [, forceUpdate] = useReducer((x) => x + 1, 0);
//   const showRideRequestModalRef = useRef<boolean>(false);
//   const currentRideRequestRef = useRef<any>(null);
//   const userHasRideRequestRef = useRef<boolean>(false);
//   // ─────────────────────────────────────────────────────────────────────────────────

//   // Send message to WebView
//   const sendToWebView = useCallback((data: any) => {
//     if (!webViewRef.current) {
//       logger.warn('Cannot send to WebView: ref is null');
//       return;
//     }
//     NavigationHelper.sendMessage(webViewRef, data.type, data.payload);
//   }, []);

//   // ─── Accept Ride ───
//   const handleAcceptRide = async (rideId: string) => {
//     logger.info('Accepting ride:', rideId);

//     if (!currentRideRequestRef.current) {
//       logger.error('No current ride request data');
//       return;
//     }

//     showRideRequestModalRef.current = false;
//     forceUpdate();

//     try {
//       setIsLoading(true);

//       const { deviceId } = await getDeviceInfo();
//       const response = await fetch(`${API_URL}/devices/acceptride/${deviceId}`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//       });

//       if (!response.ok) throw new Error('Failed to accept ride');

//       const result = await response.json();
//       logger.info('Ride accepted successfully:', result);

//       await FloatingBubbleService.decrementBadge();
//       await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.ACCEPTED, { rideId });

//       const urls = await getFrontendUrls();

//       let targetUrl = '';
//       const userType = currentRideRequestRef.current?.userType;

//       if (userType === 'driver') {
//         targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
//       } else if (userType === 'delivery') {
//         targetUrl = urls['okra-delivery-app'] || 'http://10.64.246.23:3003';
//       } else if (userType === 'conductor') {
//         targetUrl = urls['okra-conductor-app'] || 'http://10.64.246.23:3004';
//       } else {
//         logger.warn(`Unknown userType: ${userType}, defaulting to driver app`);
//         targetUrl = urls['okra-driver-app'] || 'http://10.64.246.23:3002';
//       }

//       if (webViewRef.current) {
//         webViewRef.current.injectJavaScript(`
//           window.location.href = "${targetUrl}/active-ride/${rideId}";
//         `);
//       }

//       logger.info(`Navigating ${userType} to: ${targetUrl}/active-ride/${rideId}`);

//       currentRideRequestRef.current = null;
//       forceUpdate();
//     } catch (error) {
//       logger.error('Error accepting ride:', error);

//       showRideRequestModalRef.current = true;
//       forceUpdate();

//       if (webViewRef.current) {
//         webViewRef.current.injectJavaScript(`
//           alert('Failed to accept ride. Please try again.');
//         `);
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ─── Decline Ride ───
//   const handleDeclineRide = async (rideId: string) => {
//     logger.info('Declining ride:', rideId);

//     if (!currentRideRequestRef.current) {
//       logger.error('No current ride request data');
//       return;
//     }

//     showRideRequestModalRef.current = false;
//     forceUpdate();

//     try {
//       setIsLoading(true);

//       const response = await fetch(`${API_URL}/rides/${rideId}/decline`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ reason: 'Driver declined' }),
//       });

//       if (!response.ok) throw new Error('Failed to decline ride');

//       const result = await response.json();
//       logger.info('Ride declined successfully:', result);

//       await FloatingBubbleService.decrementBadge();
//       await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.DECLINE, {
//         rideId,
//         reason: 'Driver declined',
//       });

//       logger.info(`Ride declined by ${currentRideRequestRef.current?.userType}`);

//       currentRideRequestRef.current = null;
//       forceUpdate();
//     } catch (error) {
//       logger.error('Error declining ride:', error);
//       currentRideRequestRef.current = null;
//       forceUpdate();
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const fetchPendingRideRequest = async () => {
//     try {
//       const { deviceId } = await getDeviceInfo();
//       const response = await fetch(`${API_URL}/devices/pending-ride/${deviceId}`);
//       const result = await response.json();
//       if (result.success && result.data && result.data.length > 0) {
//         const pendingRide = result.data[0];
//         const rideData = {
//           rideId: pendingRide.rideId,
//           rideCode: pendingRide.rideCode,
//           riderName: pendingRide.rider?.name,
//           rider: {
//             name: pendingRide.rider?.name,
//             rating: 5.0,
//             totalRides: 0,
//           },
//           pickupLocation: pendingRide.pickupLocation,
//           dropoffLocation: pendingRide.dropoffLocation,
//           distance: pendingRide.distance,
//           estimatedFare: pendingRide.estimatedFare,
//         };
//         currentRideRequestRef.current = rideData;
//         forceUpdate();
//       }
//     } catch (error) {
//       logger.error('Error fetching pending ride request:', error);
//     }
//   };

//   const normalizeRideRequest = (raw: any): any => {
//     const pickup = raw.pickupLocation || raw.pickup || {};
//     const dropoff = raw.dropoffLocation || raw.dropoff || {};

//     return {
//       rideId: raw.rideId || raw.id,
//       rideCode: raw.rideCode || `RIDE-${raw.rideId || raw.id}`,
//       riderName: raw.riderName || raw.rider?.name,
//       rider: {
//         name: raw.riderName || raw.rider?.name || 'Rider',
//         rating: raw.rider?.rating || 5.0,
//         totalRides: raw.rider?.totalRides || 0,
//       },
//       pickupLocation: {
//         address: pickup.address || raw.pickupAddress || 'Pickup location',
//         lat: pickup.lat || 0,
//         lng: pickup.lng || 0,
//         name: pickup.name,
//       },
//       dropoffLocation: {
//         address: dropoff.address || raw.dropoffAddress || 'Dropoff location',
//         lat: dropoff.lat || 0,
//         lng: dropoff.lng || 0,
//         name: dropoff.name,
//       },
//       distance: raw.distance || 0,
//       estimatedFare: raw.estimatedFare || raw.fare || 0,
//     };
//   };

//   // Initialize notification service on mount
//   useEffect(() => {
//     const initNotifications = async () => {
//       await NotificationService.initialize(sendToWebView);
//     };
//     initNotifications();
//     return () => { NotificationService.cleanup(); };
//   }, [sendToWebView]);

//   // Listen for notification responses (Accept/Decline buttons)
//   useEffect(() => {
//     const subscription = Notifications.addNotificationResponseReceivedListener(response => {
//       logger.info('📨 Notification response received:', response);

//       const { actionIdentifier, notification } = response;
//       const data = notification.request.content.data;

//       if (data.type === 'ride_request') {
//         if (actionIdentifier === 'accept') {
//           logger.info('✅ User accepted ride from notification:', data.rideId);
//           currentRideRequestRef.current = data;
//           forceUpdate();
//           handleAcceptRide(String(data.rideId));
//         } else if (actionIdentifier === 'decline') {
//           logger.info('❌ User declined ride from notification:', data.rideId);
//           currentRideRequestRef.current = data;
//           forceUpdate();
//           handleDeclineRide(String(data.rideId));
//         } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
//           logger.info('👆 User tapped notification:', data.rideId);
//           currentRideRequestRef.current = data;
//           showRideRequestModalRef.current = true;
//           forceUpdate();
//         }
//       }
//     });

//     return () => subscription.remove();
//   }, []);

//   // Monitor network connectivity + active ride on mount
//   useEffect(() => {
//     const handleActiveRide = async () => {
//       try {
//         const { deviceId } = await getDeviceInfo();
//         console.log('rides API_URL', API_URL);
//         const rideResponse = await fetch(`${API_URL}/devices/activeride/${deviceId}`);
//         console.log('Response received:', rideResponse.status);

//         if (!rideResponse.ok) throw new Error('Failed to fetch URLs');

//         const rideRes = await rideResponse.json();
//         console.log('rides-ridesResponse', rideRes);

//         if (rideRes.data) {
//           const urls = await getFrontendUrls();

//           if (typeof window !== 'undefined' && rideRes?.success) {
//             const ride = rideRes?.data;

//             if (rideRes.userRole === 'rider') {
//               if (ride.rideStatus === 'pending') {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-rider-app']}/finding-driver?rideId=${ride.id}";
//                 `);
//               } else if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-rider-app']}/tracking?rideId=${ride.id}";
//                 `);
//               }
//             } else if (rideRes.userRole === 'driver') {
//               if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-driver-app']}/active-ride/${ride.id}";
//                 `);
//               }
//             } else if (rideRes.userRole === 'delivery') {
//               if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-delivery-app']}/active-ride/${ride.id}";
//                 `);
//               }
//             } else if (rideRes.userRole === 'conductor') {
//               if (['accepted', 'arrived', 'passenger_onboard'].includes(ride.rideStatus)) {
//                 webViewRef.current?.injectJavaScript(`
//                   window.location.href = "${urls['okra-conductor-app']}/active-ride/${ride.id}";
//                 `);
//               }
//             }
//           }
//         }
//       } catch (error) {
//         logger.error('Error handling active ride:', error);
//       }
//     };

//     handleActiveRide();
//     fetchPendingRideRequest();

//     const unsubscribe = NetInfo.addEventListener(state => {
//       setIsConnected(state.isConnected ?? false);

//       if (state.isConnected && servicesInitialized) {
//         if (!DeviceSocketService.isConnected()) {
//           logger.info('Network restored, reconnecting socket...');
//           DeviceSocketService.reconnect();
//         }
//       }
//     });

//     return () => unsubscribe();
//   }, [servicesInitialized]);

//   // Handle App State Changes
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', async (nextAppState) => {
//       logger.info(`App state changed: ${appState} -> ${nextAppState}`);

//       if (appState.match(/inactive|background/) && nextAppState === 'active') {
//         fetchPendingRideRequest();
//         logger.info('App resumed to foreground');
//         console.log('isOnlineRef.current', isOnlineRef.current);
//         if (await FloatingBubbleService.isShowing()) {
//           await FloatingBubbleService.stop();
//         }
//         if (servicesInitialized && !DeviceSocketService.isConnected()) {
//           logger.warn('Socket disconnected, attempting reconnect');
//           await DeviceSocketService.reconnect();
//         }
//         sendToWebView({ type: WEBVIEW_EVENTS.APP_RESUMED, payload: {} });
//       } else if (nextAppState === 'background') {
//         logger.info('App moved to background');
//         await FloatingBubbleService.start();
//         if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
//           await BackgroundService.ensureForegroundService();
//         }
//       }

//       setAppState(nextAppState);
//     });

//     return () => subscription.remove();
//   }, [appState, servicesInitialized, sendToWebView]);

//   // Setup Socket Listeners
//   const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
//     logger.info(`Setting up socket listeners for ${frontendName}`);

//     // ── CORE DEVICE EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.CONNECTION.GET_CURRENT_LOCATION, async () => {
//       console.log('socketlog- getCurrentLocation: Backend requested current location');
//       try {
//         const location = await LocationService.getCurrentLocation();
//         if (location) {
//           sendToWebView({
//             type: WEBVIEW_EVENTS.LOCATION_UPDATE,
//             payload: {
//               lat: location.coords.latitude,
//               lng: location.coords.longitude,
//               accuracy: location.coords.accuracy,
//               heading: location.coords.heading,
//               speed: location.coords.speed,
//             },
//           });
//         }
//       } catch (error) {
//         logger.error('Error getting location on request:', error);
//       }
//     });

//     DeviceSocketService.on('showNotification', async (notification: any) => {
//       console.log('socketlog- showNotification:', JSON.stringify(notification, null, 2));
//       await NotificationService.show(notification);
//       sendToWebView({ type: WEBVIEW_EVENTS.NOTIFICATION_RECEIVED, payload: notification });
//     });

//     if (Platform.OS === 'android' && frontendName !== 'rider') {
//       DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
//         console.log('socketlog- showDrawOver:', JSON.stringify(overlayData, null, 2));

//         if (overlayData.shouldDrawOver === false) {
//           await FloatingBubbleService.incrementBadge();
//           await FloatingBubbleService.showRipple();
//           await NotificationService.showRideRequest({
//             rideId: overlayData.rideId,
//             rideCode: overlayData.rideCode,
//             riderName: overlayData.riderName,
//             pickupAddress: overlayData.pickupLocation?.address || overlayData.pickupAddress || 'Pickup',
//             dropoffAddress: overlayData.dropoffLocation?.address || overlayData.dropoffAddress || 'Dropoff',
//             estimatedFare: overlayData.estimatedFare || 0,
//             distance: overlayData.distance || 0,
//             pickupLocation: overlayData.pickupLocation,
//             dropoffLocation: overlayData.dropoffLocation,
//           });
//           sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW, payload: overlayData });
//           return;
//         }

//         await AudioService.playAlert('ride_request');
//         await FloatingBubbleService.incrementBadge();
//         await FloatingBubbleService.showRipple();

//         const hasPermission = await PermissionManager.checkDrawOverPermission();
//         if (hasPermission) {
//           await BackgroundService.showRideRequest(overlayData);
//         }

//         await NotificationService.showRideRequest({
//           rideId: overlayData.rideId,
//           rideCode: overlayData.rideCode,
//           riderName: overlayData.riderName,
//           pickupAddress: overlayData.pickupLocation?.address || overlayData.pickupAddress || 'Pickup',
//           dropoffAddress: overlayData.dropoffLocation?.address || overlayData.dropoffAddress || 'Dropoff',
//           estimatedFare: overlayData.estimatedFare || 0,
//           distance: overlayData.distance || 0,
//           pickupLocation: overlayData.pickupLocation,
//           dropoffLocation: overlayData.dropoffLocation,
//         });

//         sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW, payload: overlayData });
//       });
//     }

//     // ── RIDE LIFECYCLE EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_CREATED, (data: any) => {
//       console.log('socketlog- ride:request:created:', JSON.stringify(data, null, 2));
//       sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_CREATED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_NEW, async (data: any) => {
//       console.log('socketlog- ride:request:new:', JSON.stringify(data, null, 2));

//       await AudioService.playAlert('ride_request');
//       await FloatingBubbleService.incrementBadge();
//       await FloatingBubbleService.showRipple();

//       // ✅ Use refs — not setState — to avoid stale closure
//       currentRideRequestRef.current = data;
//       showRideRequestModalRef.current = true;
//       forceUpdate();

//       await NotificationService.showRideRequest({
//         rideId: data.rideId,
//         rideCode: data.rideCode,
//         riderName: data.riderName,
//         pickupAddress: data.pickupLocation?.address || data.pickupAddress || 'Pickup',
//         dropoffAddress: data.dropoffLocation?.address || data.dropoffAddress || 'Dropoff',
//         estimatedFare: data.estimatedFare || 0,
//         distance: data.distance || 0,
//         pickupLocation: data.pickupLocation,
//         dropoffLocation: data.dropoffLocation,
//       });

//       const hasPermission = await PermissionManager.checkDrawOverPermission();
//       if (hasPermission) {
//         await BackgroundService.showRideRequest(data);
//       }

//       sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_RECEIVED, async (data: any) => {
//       console.log('socketlog- ride:request:received:', data);

//       await AudioService.playAlert('ride_request');
//       await FloatingBubbleService.incrementBadge();
//       await FloatingBubbleService.showRipple();

//       // ✅ Use refs — not setState — to avoid stale closure
//       const normalized = normalizeRideRequest(data);
//       currentRideRequestRef.current = normalized;
//       userHasRideRequestRef.current = true;
//       showRideRequestModalRef.current = true;
//       forceUpdate();

//       await NotificationService.showRideRequest({
//         rideId: data.rideId,
//         rideCode: data.rideCode,
//         riderName: data.riderName,
//         pickupAddress: data.pickupLocation?.address || data.pickupAddress || 'Pickup',
//         dropoffAddress: data.dropoffLocation?.address || data.dropoffAddress || 'Dropoff',
//         estimatedFare: data.estimatedFare || 0,
//         distance: data.distance || 0,
//         pickupLocation: data.pickupLocation,
//         dropoffLocation: data.dropoffLocation,
//       });

//       const hasPermission = await PermissionManager.checkDrawOverPermission();
//       if (hasPermission) {
//         await BackgroundService.showRideRequest(data);
//       }

//       sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_RECEIVED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPTED, async (data: any) => {
//       console.log('socketlog- ride:accepted:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Ride Accepted',
//         body: 'Your driver has accepted the ride request',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.RIDE_ACCEPTED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TAKEN, (data: any) => {
//       console.log('socketlog- ride:taken:', JSON.stringify(data, null, 2));
//       sendToWebView({ type: WEBVIEW_EVENTS.RIDE_TAKEN, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ARRIVED, async (data: any) => {
//       console.log('socketlog- ride:driver:arrived:', JSON.stringify(data, null, 2));
//       await AudioService.playAlert('driver_arrived');
//       await NotificationService.showHighPriority({
//         title: 'Driver Arrived',
//         body: 'Your driver is waiting for you',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_ARRIVED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_STARTED, async (data: any) => {
//       console.log('socketlog- ride:trip:started:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Trip Started',
//         body: 'Your trip has begun. Safe travels!',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.TRIP_STARTED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_COMPLETED, async (data: any) => {
//       console.log('socketlog- ride:trip:completed:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Trip Completed',
//         body: `Fare: K${data.finalFare?.toFixed(2) || 0}`,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.TRIP_COMPLETED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.CANCELLED, async (data: any) => {
//       console.log('socketlog- ride:cancelled:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Ride Cancelled',
//         body: data.reason || 'The ride has been cancelled',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.RIDE_CANCELLED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPT_SUCCESS, (data: any) => {
//       console.log('socketlog- ride:accept:success:', JSON.stringify(data, null, 2));
//       sendToWebView({ type: WEBVIEW_EVENTS.RIDE_ACCEPT_SUCCESS, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDE.DECLINE_SUCCESS, (data: any) => {
//       console.log('socketlog- ride:decline:success:', JSON.stringify(data, null, 2));
//       sendToWebView({ type: WEBVIEW_EVENTS.RIDE_DECLINE_SUCCESS, payload: data });
//     });

//     // ── LOCATION EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.LOCATION_UPDATED, (data: any) => {
//       console.log('socketlog- driver:location:updated');
//       sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_LOCATION_UPDATED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RIDER.LOCATION_UPDATED, (data: any) => {
//       console.log('socketlog- rider:location:updated');
//       sendToWebView({ type: WEBVIEW_EVENTS.RIDER_LOCATION_UPDATED, payload: data });
//     });

//     // ── DRIVER AVAILABILITY EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ONLINE_SUCCESS, (data: any) => {
//       console.log('socketlog- driver:online:success:', JSON.stringify(data, null, 2));
//       sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_ONLINE_SUCCESS, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.OFFLINE_SUCCESS, (data: any) => {
//       console.log('socketlog- driver:offline:success:', JSON.stringify(data, null, 2));
//       sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_OFFLINE_SUCCESS, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.FORCED_OFFLINE, async (data: any) => {
//       console.log('socketlog- driver:forced:offline:', JSON.stringify(data, null, 2));
//       await NotificationService.showHighPriority({
//         title: 'Account Status',
//         body: data.message || 'You have been taken offline',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_FORCED_OFFLINE, payload: data });
//     });

//     // ── SUBSCRIPTION EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRING_WARNING, async (data: any) => {
//       console.log('socketlog- subscription:expiring:warning:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Subscription Expiring Soon',
//         body: `Your ${data.planName} plan expires in ${data.daysRemaining} days`,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRING, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRED, async (data: any) => {
//       console.log('socketlog- subscription:expired:', JSON.stringify(data, null, 2));
//       await NotificationService.showHighPriority({
//         title: 'Subscription Expired',
//         body: data.message || 'Your subscription has expired',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.ACTIVATED, async (data: any) => {
//       console.log('socketlog- subscription:activated:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Subscription Activated',
//         body: `Your ${data.planName} plan is now active`,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.SUBSCRIPTION_ACTIVATED, payload: data });
//     });

//     // ── PAYMENT EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.SUCCESS, async (data: any) => {
//       console.log('socketlog- payment:success:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Payment Successful',
//         body: `K${data.amount?.toFixed(2) || 0} - ${data.type}`,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.PAYMENT_SUCCESS, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.FAILED, async (data: any) => {
//       console.log('socketlog- payment:failed:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Payment Failed',
//         body: data.reason || 'Your payment could not be processed',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.PAYMENT_FAILED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.WITHDRAWAL.PROCESSED, async (data: any) => {
//       console.log('socketlog- withdrawal:processed:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Withdrawal Processed',
//         body: `K${data.amount?.toFixed(2) || 0} via ${data.method}`,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.WITHDRAWAL_PROCESSED, payload: data });
//     });

//     // ── RATING EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.RATING.REQUEST, async (data: any) => {
//       console.log('socketlog- rating:request:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Rate Your Experience',
//         body: `Please rate your ${data.ratingType || 'recent'} trip`,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.RATING_REQUEST, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.RATING.SUBMITTED, (data: any) => {
//       console.log('socketlog- rating:submitted:', JSON.stringify(data, null, 2));
//       sendToWebView({ type: WEBVIEW_EVENTS.RATING_SUBMITTED, payload: data });
//     });

//     // ── NOTIFICATION EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.NEW, async (data: any) => {
//       console.log('socketlog- notification:new:', JSON.stringify(data, null, 2));
//       await NotificationService.show(data);
//       sendToWebView({ type: WEBVIEW_EVENTS.NOTIFICATION_NEW, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.BROADCAST, async (data: any) => {
//       console.log('socketlog- notification:broadcast:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: data.title || 'Announcement',
//         body: data.message || data.body,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.NOTIFICATION_BROADCAST, payload: data });
//     });

//     // ── SOS & EMERGENCY EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.SOS.TRIGGERED, async (data: any) => {
//       console.log('socketlog- sos:triggered:', JSON.stringify(data, null, 2));
//       await NotificationService.showHighPriority({
//         title: 'SOS Alert Sent',
//         body: 'Emergency services have been notified',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.SOS_TRIGGERED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.SOS.ACKNOWLEDGED, async (data: any) => {
//       console.log('socketlog- sos:acknowledged:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'SOS Acknowledged',
//         body: `Your alert has been acknowledged by ${data.acknowledgedBy}`,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.SOS_ACKNOWLEDGED, payload: data });
//     });

//     // ── AFFILIATE EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.REFERRAL_SIGNUP, async (data: any) => {
//       console.log('socketlog- affiliate:referral:signup:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Referral Signup',
//         body: `${data.referredUser} signed up! +${data.points} points`,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.AFFILIATE_REFERRAL_SIGNUP, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.COMMISSION_EARNED, async (data: any) => {
//       console.log('socketlog- affiliate:commission:earned:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Commission Earned',
//         body: `K${data.amount?.toFixed(2) || 0} commission earned`,
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.AFFILIATE_COMMISSION_EARNED, payload: data });
//     });

//     // ── SYSTEM EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.SYSTEM.ANNOUNCEMENT, async (data: any) => {
//       console.log('socketlog- system:announcement:', JSON.stringify(data, null, 2));
//       if (data.priority === 'high' || data.priority === 'urgent') {
//         await NotificationService.showHighPriority({
//           title: 'Important Announcement',
//           body: data.message,
//           data,
//         });
//       } else {
//         await NotificationService.show({
//           title: 'Announcement',
//           body: data.message,
//           data,
//         });
//       }
//       sendToWebView({ type: WEBVIEW_EVENTS.SYSTEM_ANNOUNCEMENT, payload: data });
//     });

//     // ── SESSION EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.RIDER.SESSION_REPLACED, async (data: any) => {
//       console.log('socketlog- rider:session-replaced:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Session Replaced',
//         body: data.message || 'You have logged in on another device',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.SESSION_REPLACED, payload: data });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DRIVER.SESSION_REPLACED, async (data: any) => {
//       console.log('socketlog- driver:session-replaced:', JSON.stringify(data, null, 2));
//       await NotificationService.show({
//         title: 'Session Replaced',
//         body: data.message || 'You have logged in on another device',
//         data,
//       });
//       sendToWebView({ type: WEBVIEW_EVENTS.SESSION_REPLACED, payload: data });
//     });

//     // ── CONNECTION STATUS EVENTS ──
//     DeviceSocketService.on(SOCKET_EVENTS.CONNECTED, () => {
//       console.log('socketlog- connected: Socket connection established');
//       sendToWebView({ type: WEBVIEW_EVENTS.SOCKET_CONNECTED, payload: {} });
//     });

//     DeviceSocketService.on(SOCKET_EVENTS.DISCONNECTED, (data: any) => {
//       console.log('socketlog- disconnected:', JSON.stringify(data, null, 2));
//       sendToWebView({ type: WEBVIEW_EVENTS.SOCKET_DISCONNECTED, payload: data });
//     });

//     // ── ERROR EVENTS ──
//     DeviceSocketService.on('socket_error', (data: any) => {
//       console.log('socketlog- socket_error:', JSON.stringify(data, null, 2));
//       sendToWebView({ type: WEBVIEW_EVENTS.SOCKET_ERROR, payload: data });
//     });

//     logger.info('✅ All socket event listeners registered');
//   }, [sendToWebView]);

//   // Handle messages from WebView
//   const onMessage = async (event: any) => {
//     try {
//       const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
//       const { type, requestId, payload } = message;

//       logger.info(`Received message from WebView: ${type}${requestId ? ` (requestId: ${requestId})` : ''}`);

//       let response: any = null;

//       switch (type) {
//         case 'INITIALIZE_SERVICES':
//           response = await handleInitializeServices(payload);
//           break;
//         case 'LOG_DATA':
//           response = await handleLogDataFromWebView(payload);
//           break;
//         case 'REQUEST_PERMISSION':
//           response = await handleRequestPermission(payload);
//           break;
//         case 'CHECK_PERMISSION':
//           response = await handleCheckPermission(payload);
//           break;
//         case 'GET_CURRENT_LOCATION':
//           response = await handleGetCurrentLocation();
//           break;
//         case 'START_LOCATION_TRACKING':
//           response = await handleStartLocationTracking(payload);
//           break;
//         case 'STOP_LOCATION_TRACKING':
//           response = await handleStopLocationTracking();
//           break;
//         case 'SHOW_NOTIFICATION':
//           response = await handleShowNotification(payload);
//           break;
//         case 'PLAY_AUDIO':
//           response = await handlePlayAudio(payload);
//           break;
//         case 'GO_ONLINE':
//           response = await handleGoOnline(payload);
//           break;
//         case 'GO_OFFLINE':
//           response = await handleGoOffline(payload);
//           break;
//         default:
//           logger.warn(`Unknown message type: ${type}`);
//           response = { error: 'Unknown message type' };
//       }

//       if (requestId) {
//         const messageToSend = {
//           type,
//           requestId,
//           payload: response?.error ? null : response,
//           error: response?.error || undefined,
//         };
//         logger.info(`Sending response back to WebView for ${type}`, messageToSend);
//         if (webViewRef.current) {
//           webViewRef.current.postMessage(JSON.stringify(messageToSend));
//         }
//       }
//     } catch (error: any) {
//       logger.error('Error handling WebView message:', error);
//       try {
//         const { requestId, type } = JSON.parse(event.nativeEvent.data);
//         if (requestId && webViewRef.current) {
//           webViewRef.current.postMessage(JSON.stringify({
//             type,
//             requestId,
//             payload: null,
//             error: error.message,
//           }));
//         }
//       } catch {}
//     }
//   };

//   // Initialize Services
//   const handleInitializeServices = async (payload: any) => {
//     try {
//       const { userId, frontendName, socketServerUrl } = payload;
//       logger.info(`Initializing services for ${frontendName}, user: ${userId}`);

//       if (servicesInitialized) {
//         logger.warn('Services already initialized');
//         return { success: true, reason: 'already_initialized' };
//       }

//       const deviceInfo = await getDeviceInfo();
//       const deviceId = deviceInfo.deviceId;
//       deviceIdRef.current = deviceId;
//       userIdRef.current = userId;
//       frontendNameRef.current = frontendName;

//       LocationService.setDeviceId(deviceId);

//       const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);

//       if (!permissionsGranted.location) {
//         logger.error('Location permission denied - cannot initialize');
//         return {
//           success: false,
//           error: 'Location permission required',
//           permissions: permissionsGranted,
//         };
//       }

//       const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
//       const servicesStarted = await BackgroundService.start({
//         deviceId,
//         userId,
//         frontendName,
//         socketServerUrl: socketUrl,
//       });

//       if (!servicesStarted) {
//         logger.error('Failed to start background services');
//         return { success: false, error: 'Failed to start services' };
//       }

//       setupSocketListeners(deviceId, frontendName);
//       setServicesInitialized(true);
//       logger.info('✅ Services initialized successfully');

//       return {
//         success: true,
//         deviceId,
//         permissions: permissionsGranted,
//         socketConnected: DeviceSocketService.isConnected(),
//       };
//     } catch (error: any) {
//       logger.error('Error initializing services:', error);
//       return { success: false, error: error.message };
//     }
//   };

//   const handleRequestPermission = async (payload: any) => {
//     const { permissionType } = payload;
//     try {
//       const status = await PermissionManager.request(permissionType);
//       return { status };
//     } catch (error: any) {
//       return { status: 'denied', error: error.message };
//     }
//   };

//   const handleCheckPermission = async (payload: any) => {
//     const { permissionType } = payload;
//     const status = await PermissionManager.check(permissionType);
//     return { status };
//   };

//   const handleLogDataFromWebView = async (payload: any) => {
//     console.log('Log from webview', payload);
//     return { success: true };
//   };

//   const handleGetCurrentLocation = async () => {
//     try {
//       const location = await LocationService.getCurrentLocation();
//       if (!location) return { error: 'Could not get location' };
//       return location;
//     } catch (error: any) {
//       return { error: error.message };
//     }
//   };

//   const handleStartLocationTracking = async (payload: any) => {
//     try {
//       if (!deviceIdRef.current) throw new Error('Device not initialized');
//       const success = await LocationService.startPersistentTracking(deviceIdRef.current);
//       return { success };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   const handleStopLocationTracking = async () => {
//     try {
//       await LocationService.stopPersistentTracking();
//       return { success: true };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   const handleShowNotification = async (payload: any) => {
//     try {
//       await NotificationService.show(payload);
//       return { success: true };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   const handlePlayAudio = async (payload: any) => {
//     const { soundFile } = payload;
//     try {
//       await AudioService.playAlert(soundFile);
//       return { success: true };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   const handleGoOnline = async (payload: any) => {
//     try {
//       const location = await LocationService.getCurrentLocation();
//       if (!location) throw new Error('Cannot get current location');

//       await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.ONLINE, {
//         driverId: userIdRef.current,
//         location: {
//           lat: location.coords.latitude,
//           lng: location.coords.longitude,
//         },
//       });

//       if (deviceIdRef.current) {
//         const trackingStarted = await LocationService.startPersistentTracking(deviceIdRef.current);
//         if (trackingStarted) {
//           isOnlineRef.current = true;
//           await FloatingBubbleService.start();
//         }
//       }

//       return {
//         success: true,
//         location: {
//           lat: location.coords.latitude,
//           lng: location.coords.longitude,
//         },
//       };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   const handleGoOffline = async (payload: any) => {
//     try {
//       await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.OFFLINE, {
//         driverId: userIdRef.current,
//       });

//       if (isOnlineRef.current) {
//         await LocationService.stopPersistentTracking();
//         await FloatingBubbleService.stop();
//         isOnlineRef.current = false;
//       }

//       return { success: true };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   const handleWebViewError = (syntheticEvent: any) => {
//     const { nativeEvent } = syntheticEvent;
//     logger.error('WebView error:', nativeEvent);
//     setHasError(true);
//   };

//   const handleLoadEnd = () => {
//     logger.info('loading ended');
//     setIsLoading(false);
//   };

//   if (hasError) {
//     return (
//       <View style={styles.errorContainer}>
//         <Text style={styles.errorTitle}>😔 Oops!</Text>
//         <Text style={styles.errorText}>Something went wrong loading the app.</Text>
//         <Text style={styles.errorSubtext}>Please check your internet connection and try again.</Text>
//       </View>
//     );
//   }

//   if (!isConnected) {
//     return (
//       <View style={styles.offlineContainer}>
//         <Text style={styles.offlineTitle}>📡 No Connection</Text>
//         <Text style={styles.offlineText}>
//           You're currently offline. Please check your internet connection.
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
//       <WebView
//         ref={webViewRef}
//         source={{ uri: FRONTEND_URL }}
//         onMessage={onMessage}
//         javaScriptEnabled={true}
//         domStorageEnabled={true}
//         geolocationEnabled={true}
//         startInLoadingState={true}
//         originWhitelist={['*']}
//         allowsInlineMediaPlayback={true}
//         mediaPlaybackRequiresUserAction={false}
//         style={styles.webview}
//         onError={handleWebViewError}
//         onLoadEnd={handleLoadEnd}
//         onHttpError={(syntheticEvent) => {
//           const { nativeEvent } = syntheticEvent;
//           logger.error('WebView HTTP error:', nativeEvent.statusCode);
//         }}
//         cacheEnabled={true}
//         cacheMode="LOAD_DEFAULT"
//         mixedContentMode="always"
//         allowFileAccess={false}
//         allowUniversalAccessFromFileURLs={false}
//       />

//       {/* Ride Request Modal — driven by refs + forceUpdate */}
//       <RideRequestModal
//         open={showRideRequestModalRef.current}
//         rideRequest={currentRideRequestRef.current}
//         onAccept={handleAcceptRide}
//         onDecline={handleDeclineRide}
//       />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFFFFF',
//   },
//   webview: {
//     flex: 1,
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     padding: 24,
//   },
//   errorTitle: {
//     fontSize: 48,
//     marginBottom: 16,
//   },
//   errorText: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#1A1A1A',
//     textAlign: 'center',
//     marginBottom: 8,
//   },
//   errorSubtext: {
//     fontSize: 14,
//     color: '#666666',
//     textAlign: 'center',
//   },
//   offlineContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     padding: 24,
//   },
//   offlineTitle: {
//     fontSize: 48,
//     marginBottom: 16,
//   },
//   offlineText: {
//     fontSize: 16,
//     color: '#666666',
//     textAlign: 'center',
//   },
// });
