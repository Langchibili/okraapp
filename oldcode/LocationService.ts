// // // //OkraApp\src\services\LocationService.ts
// // // import * as Location from 'expo-location';
// // // import * as TaskManager from 'expo-task-manager';
// // // import { Platform } from 'react-native';
// // // import DeviceSocketService from './DeviceSocketService';
// // // import { logger } from '../utils/logger';

// // // const LOCATION_TASK_NAME = 'background-location-task';

// // // interface LocationConfig {
// // //   accuracy: Location.LocationAccuracy;
// // //   timeInterval: number;
// // //   distanceInterval: number;
// // //   showsBackgroundLocationIndicator: boolean;
// // //   foregroundService?: {
// // //     notificationTitle: string;
// // //     notificationBody: string;
// // //     notificationColor: string;
// // //   };
// // // }

// // // class LocationService {
// // //   private isTracking: boolean = false;
// // //   private deviceId: string | null = null;
// // //   private watchSubscription: Location.LocationSubscription | null = null;

// // //   /**
// // //    * Start persistent location tracking (Google Best Practices 2026)
// // //    * - Android: Uses Foreground Service
// // //    * - iOS: Uses Background Location Session with indicator
// // //    */
// // //   async startPersistentTracking(deviceId: string): Promise<boolean> {
// // //     try {
// // //       logger.info('Starting persistent location tracking');

// // //       this.deviceId = deviceId;

// // //       // Check permissions
// // //       const { status } = await Location.getForegroundPermissionsAsync();
// // //       if (status !== 'granted') {
// // //         logger.error('Location permission not granted');
// // //         return false;
// // //       }

// // //       // For background tracking, need background permission
// // //       const backgroundStatus = await Location.getBackgroundPermissionsAsync();
// // //       if (backgroundStatus.status !== 'granted') {
// // //         logger.warn('Background location permission not granted');
// // //         // Continue anyway for foreground tracking
// // //       }

// // //       // Define background task if not already defined
// // //       const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
// // //       if (!isTaskDefined) {
// // //         this.defineLocationTask();
// // //       }

// // //       // Configuration following Google's best practices
// // //       const config: LocationConfig = {
// // //         accuracy: Location.Accuracy.High, // High accuracy for taxi service
// // //         timeInterval: 5000, // Update every 5 seconds (streaming)
// // //         distanceInterval: 10, // Or every 10 meters
// // //         showsBackgroundLocationIndicator: true, // iOS indicator
// // //         foregroundService: Platform.OS === 'android' ? {
// // //           notificationTitle: 'Okra App: You\'re Online',
// // //           notificationBody: 'Receiving ride requests in your area',
// // //           notificationColor: '#FF6B00',
// // //         } : undefined,
// // //       };

// // //       // Start background location updates
// // //       await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
// // //         accuracy: config.accuracy,
// // //         timeInterval: config.timeInterval,
// // //         distanceInterval: config.distanceInterval,
// // //         showsBackgroundLocationIndicator: config.showsBackgroundLocationIndicator,
// // //         foregroundService: config.foregroundService,
// // //         // Android-specific
// // //         deferredUpdatesInterval: Platform.OS === 'android' ? 5000 : undefined,
// // //         // iOS-specific
// // //         activityType: Platform.OS === 'ios' ? Location.ActivityType.AutomotiveNavigation : undefined,
// // //         pausesUpdatesAutomatically: false, // Never pause updates
// // //       });

// // //       this.isTracking = true;
// // //       logger.info('✅ Persistent location tracking started');

// // //       return true;
// // //     } catch (error) {
// // //       logger.error('Error starting persistent tracking:', error);
// // //       return false;
// // //     }
// // //   }

// // //   /**
// // //    * Define background location task
// // //    * This runs even when app is backgrounded/minimized
// // //    */
// // //   private defineLocationTask() {
// // //     TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
// // //       if (error) {
// // //         logger.error('Location task error:', error);
// // //         return;
// // //       }

// // //       if (data) {
// // //         const { locations } = data;
// // //         if (locations && locations.length > 0) {
// // //           const location = locations[0];
          
// // //           logger.debug('Background location update:', {
// // //             lat: location.coords.latitude,
// // //             lng: location.coords.longitude,
// // //             accuracy: location.coords.accuracy,
// // //           });

// // //           // Stream location to backend via WebSocket
// // //           if (DeviceSocketService.isConnected() && this.deviceId) {
// // //             try {
// // //               await DeviceSocketService.emit('device:location:update', {
// // //                 deviceId: this.deviceId,
// // //                 location: {
// // //                   lat: location.coords.latitude,
// // //                   lng: location.coords.longitude,
// // //                   accuracy: location.coords.accuracy,
// // //                   altitude: location.coords.altitude,
// // //                   altitudeAccuracy: location.coords.altitudeAccuracy,
// // //                   heading: location.coords.heading,
// // //                   speed: location.coords.speed,
// // //                 },
// // //                 timestamp: location.timestamp,
// // //               });

// // //               logger.debug('Location sent to backend via socket');
// // //             } catch (error) {
// // //               logger.error('Error sending location to backend:', error);
// // //             }
// // //           } else {
// // //             logger.warn('Socket not connected, location update queued');
// // //             // TODO: Queue for later if needed
// // //           }
// // //         }
// // //       }
// // //     });

// // //     logger.info('Location task defined');
// // //   }

// // //   /**
// // //    * Stop persistent tracking
// // //    */
// // //   async stopPersistentTracking(): Promise<void> {
// // //     try {
// // //       logger.info('Stopping persistent location tracking');

// // //       const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
// // //       if (isTaskDefined) {
// // //         const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
// // //         if (hasStarted) {
// // //           await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
// // //         }
// // //       }

// // //       if (this.watchSubscription) {
// // //         this.watchSubscription.remove();
// // //         this.watchSubscription = null;
// // //       }

// // //       this.isTracking = false;
// // //       this.deviceId = null;

// // //       logger.info('✅ Location tracking stopped');
// // //     } catch (error) {
// // //       logger.error('Error stopping location tracking:', error);
// // //     }
// // //   }

// // //   /**
// // //    * Get current location (one-time)
// // //    */
// // //   async getCurrentLocation(): Promise<Location.LocationObject | null> {
// // //     try {
// // //       const { status } = await Location.getForegroundPermissionsAsync();
// // //       if (status !== 'granted') {
// // //         logger.error('Location permission not granted');
// // //         return null;
// // //       }

// // //       const location = await Location.getCurrentPositionAsync({
// // //         accuracy: Location.Accuracy.High,
// // //       });

// // //       logger.debug('Got current location:', {
// // //         lat: location.coords.latitude,
// // //         lng: location.coords.longitude,
// // //       });

// // //       return location;
// // //     } catch (error) {
// // //       logger.error('Error getting current location:', error);
// // //       return null;
// // //     }
// // //   }

// // //   /**
// // //    * Check if currently tracking
// // //    */
// // //   isCurrentlyTracking(): boolean {
// // //     return this.isTracking;
// // //   }

// // //   /**
// // //    * Start foreground location watching (for when app is active)
// // //    */
// // //   async startForegroundWatch(callback: (location: Location.LocationObject) => void): Promise<void> {
// // //     try {
// // //       if (this.watchSubscription) {
// // //         this.watchSubscription.remove();
// // //       }

// // //       this.watchSubscription = await Location.watchPositionAsync(
// // //         {
// // //           accuracy: Location.Accuracy.High,
// // //           timeInterval: 3000, // More frequent when in foreground
// // //           distanceInterval: 5,
// // //         },
// // //         callback
// // //       );

// // //       logger.info('Foreground location watch started');
// // //     } catch (error) {
// // //       logger.error('Error starting foreground watch:', error);
// // //     }
// // //   }

// // //   /**
// // //    * Stop foreground watch
// // //    */
// // //   stopForegroundWatch(): void {
// // //     if (this.watchSubscription) {
// // //       this.watchSubscription.remove();
// // //       this.watchSubscription = null;
// // //       logger.info('Foreground location watch stopped');
// // //     }
// // //   }
// // // }

// // // export default new LocationService();
// // //OkraApp/src/services/LocationService.ts (Updated with Admin Settings)
// // import * as Location from 'expo-location';
// // import * as TaskManager from 'expo-task-manager';
// // import { Platform } from 'react-native';
// // import DeviceSocketService from './DeviceSocketService';
// // import { logger } from '../utils/logger';

// // const LOCATION_TASK_NAME = 'background-location-task';

// // interface LocationConfig {
// //   accuracy: Location.LocationAccuracy;
// //   timeInterval: number;
// //   distanceInterval: number;
// //   showsBackgroundLocationIndicator: boolean;
// //   foregroundService?: {
// //     notificationTitle: string;
// //     notificationBody: string;
// //     notificationColor: string;
// //   };
// // }

// // class LocationService {
// //   private isTracking: boolean = false;
// //   private deviceId: string | null = null;
// //   private watchSubscription: Location.LocationSubscription | null = null;

// //   /**
// //    * Start persistent location tracking (Google Best Practices 2026)
// //    * - Android: Uses Foreground Service
// //    * - iOS: Uses Background Location Session with indicator
// //    */
// //   async startPersistentTracking(deviceId: string, intervalOverride?: number): Promise<boolean> {
// //     try {
// //       logger.info('Starting persistent location tracking');
// //       this.deviceId = deviceId;

// //       // Check permissions
// //       const { status } = await Location.getForegroundPermissionsAsync();
// //       if (status !== 'granted') {
// //         console.error('Location permission not granted');
// //         return false;
// //       }

// //       // For background tracking, need background permission
// //       const backgroundStatus = await Location.getBackgroundPermissionsAsync();
// //       if (backgroundStatus.status !== 'granted') {
// //         logger.warn('Background location permission not granted');
// //         // Continue anyway for foreground tracking
// //       }

// //       // Define background task if not already defined
// //       const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
// //       if (!isTaskDefined) {
// //         this.defineLocationTask();
// //       }

// //       // Fetch interval from backend if not provided
// //       let updateInterval = intervalOverride || 10000; // Default 10 seconds

// //       if (!intervalOverride) {
// //         try {
// //           const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/admn-setting`);
// //           if (response.ok) {
// //             const data = await response.json();
// //             const intervalSecs = data?.data?.attributes?.getOnlineDriverCurrentLocationCronIntervalInSecs || 10;
// //             updateInterval = intervalSecs * 1000;
// //             logger.info(`Using location interval from backend: ${intervalSecs}s`);
// //           }
// //         } catch (error) {
// //           logger.warn('Could not fetch location interval from backend, using default');
// //         }
// //       }

// //       // Configuration following Google's best practices
// //       const config: LocationConfig = {
// //         accuracy: Location.Accuracy.High,
// //         timeInterval: updateInterval,
// //         distanceInterval: 10,
// //         showsBackgroundLocationIndicator: true,
// //         foregroundService: Platform.OS === 'android' ? {
// //           notificationTitle: 'Okra App: You\'re Online',
// //           notificationBody: 'Receiving ride requests in your area',
// //           notificationColor: '#FF6B00',
// //         } : undefined,
// //       };

// //       // Start background location updates
// //       await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
// //         accuracy: config.accuracy,
// //         timeInterval: config.timeInterval,
// //         distanceInterval: config.distanceInterval,
// //         showsBackgroundLocationIndicator: config.showsBackgroundLocationIndicator,
// //         foregroundService: config.foregroundService,
// //         // Android-specific
// //         deferredUpdatesInterval: Platform.OS === 'android' ? 5000 : undefined,
// //         // iOS-specific
// //         activityType: Platform.OS === 'ios' ? Location.ActivityType.AutomotiveNavigation : undefined,
// //         pausesUpdatesAutomatically: false,
// //       });

// //       this.isTracking = true;
// //       logger.info('✅ Persistent location tracking started');
// //       return true;
// //     } catch (error) {
// //       console.error('Error starting persistent tracking:', error);
// //       return false;
// //     }
// //   }

// //   /**
// //    * Define background location task
// //    * This runs even when app is backgrounded/minimized
// //    */
// //   private defineLocationTask() {
// //     TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
// //       if (error) {
// //         console.error('Location task error:', error);
// //         return;
// //       }

// //       if (data) {
// //         const { locations } = data;
// //         if (locations && locations.length > 0) {
// //           const location = locations[0];
          
// //           logger.debug('Background location update:', {
// //             lat: location.coords.latitude,
// //             lng: location.coords.longitude,
// //             accuracy: location.coords.accuracy,
// //           });

// //           // Stream location to backend via WebSocket
// //           if (DeviceSocketService.isConnected() && this.deviceId) {
// //             try {
// //               await DeviceSocketService.emit('device:location:update', {
// //                 deviceId: this.deviceId,
// //                 location: {
// //                   lat: location.coords.latitude,
// //                   lng: location.coords.longitude,
// //                   accuracy: location.coords.accuracy,
// //                   altitude: location.coords.altitude,
// //                   altitudeAccuracy: location.coords.altitudeAccuracy,
// //                   heading: location.coords.heading,
// //                   speed: location.coords.speed,
// //                 },
// //                 timestamp: location.timestamp,
// //               });
// //               logger.debug('Location sent to backend via socket');
// //             } catch (error) {
// //               console.error('Error sending location to backend:', error);
// //             }
// //           } else {
// //             logger.warn('Socket not connected, location update queued');
// //             // TODO: Queue for later if needed
// //           }
// //         }
// //       }
// //     });

// //     logger.info('Location task defined');
// //   }

// //   /**
// //    * Stop persistent tracking
// //    */
// //   async stopPersistentTracking(): Promise<void> {
// //     try {
// //       logger.info('Stopping persistent location tracking');

// //       const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
// //       if (isTaskDefined) {
// //         const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
// //         if (hasStarted) {
// //           await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
// //         }
// //       }

// //       if (this.watchSubscription) {
// //         this.watchSubscription.remove();
// //         this.watchSubscription = null;
// //       }

// //       this.isTracking = false;
// //       this.deviceId = null;
// //       logger.info('✅ Location tracking stopped');
// //     } catch (error) {
// //       console.error('Error stopping location tracking:', error);
// //     }
// //   }

// //   /**
// //    * Get current location (one-time)
// //    */
// //   async getCurrentLocation(): Promise<Location.LocationObject | null> {
// //     try {
// //       const { status } = await Location.getForegroundPermissionsAsync();
// //       if (status !== 'granted') {
// //         console.error('Location permission not granted');
// //         return null;
// //       }

// //       const location = await Location.getCurrentPositionAsync({
// //         accuracy: Location.Accuracy.High,
// //       });

// //       logger.debug('Got current location:', {
// //         lat: location.coords.latitude,
// //         lng: location.coords.longitude,
// //       })
// //       // Stream location to backend via WebSocket
// //       if (DeviceSocketService.isConnected() && this.deviceId) {
// //         try {
// //           await DeviceSocketService.emit('device:location:update', {
// //             deviceId: this.deviceId,
// //             location: {
// //               lat: location.coords.latitude,
// //               lng: location.coords.longitude,
// //               accuracy: location.coords.accuracy,
// //               altitude: location.coords.altitude,
// //               altitudeAccuracy: location.coords.altitudeAccuracy,
// //               heading: location.coords.heading,
// //               speed: location.coords.speed,
// //             },
// //             timestamp: location.timestamp,
// //           })
// //           logger.debug('Location sent to backend via socket');
// //         } catch (error) {
// //           console.error('Error sending location to backend:', error);
// //         }
// //       } else {
// //         logger.warn('Socket not connected, location update queued');
// //         // TODO: Queue for later if needed
// //       }
// //       return location;
// //     } catch (error) {
// //       console.error('Error getting current location:', error);
// //       return null;
// //     }
// //   }

// //   /**
// //    * Check if currently tracking
// //    */
// //   isCurrentlyTracking(): boolean {
// //     return this.isTracking;
// //   }

// //   /**
// //    * Start foreground location watching (for when app is active)
// //    */
// //   async startForegroundWatch(callback: (location: Location.LocationObject) => void): Promise<void> {
// //     try {
// //       if (this.watchSubscription) {
// //         this.watchSubscription.remove();
// //       }

// //       this.watchSubscription = await Location.watchPositionAsync(
// //         {
// //           accuracy: Location.Accuracy.High,
// //           timeInterval: 3000, // More frequent when in foreground
// //           distanceInterval: 5,
// //         },
// //         callback
// //       );

// //       logger.info('Foreground location watch started');
// //     } catch (error) {
// //       console.error('Error starting foreground watch:', error);
// //     }
// //   }

// //   /**
// //    * Stop foreground watch
// //    */
// //   stopForegroundWatch(): void {
// //     if (this.watchSubscription) {
// //       this.watchSubscription.remove();
// //       this.watchSubscription = null;
// //       logger.info('Foreground location watch stopped');
// //     }
// //   }
// // }

// // export default new LocationService();
// //OkraApp/src/services/LocationService.ts (Fixed)
// import * as Location from 'expo-location';
// import * as TaskManager from 'expo-task-manager';
// import { Platform } from 'react-native';
// import DeviceSocketService from './DeviceSocketService';
// import { logger } from '../utils/logger';

// const LOCATION_TASK_NAME = 'background-location-task';

// interface LocationConfig {
//   accuracy: Location.LocationAccuracy;
//   timeInterval: number;
//   distanceInterval: number;
//   showsBackgroundLocationIndicator: boolean;
//   foregroundService?: {
//     notificationTitle: string;
//     notificationBody: string;
//     notificationColor: string;
//   };
// }

// // Global variable to store deviceId for background task
// let globalDeviceId: string | null = null;

// class LocationService {
//   private isTracking: boolean = false;
//   private deviceId: string | null = null;
//   private watchSubscription: Location.LocationSubscription | null = null;

//   /**
//    * Helper function to send location update to backend
//    */
//   private async sendLocationUpdate(location: Location.LocationObject, deviceId: string): Promise<void> {
//     if (!DeviceSocketService.isConnected()) {
//       logger.warn('Socket not connected, cannot send location update');
//       return;
//     }

//     try {
//       await DeviceSocketService.emit('device:location:update', {
//         deviceId,
//         location: {
//           lat: location.coords.latitude,
//           lng: location.coords.longitude,
//           accuracy: location.coords.accuracy,
//           altitude: location.coords.altitude,
//           altitudeAccuracy: location.coords.altitudeAccuracy,
//           heading: location.coords.heading,
//           speed: location.coords.speed,
//         },
//         timestamp: location.timestamp,
//       });
//       logger.debug('Location sent to backend via socket');
//     } catch (error) {
//       logger.error('Error sending location to backend:', error);
//     }
//   }

//   /**
//    * Start persistent location tracking (Google Best Practices 2026)
//    * - Android: Uses Foreground Service
//    * - iOS: Uses Background Location Session with indicator
//    */
//   async startPersistentTracking(deviceId: string, intervalOverride?: number): Promise<boolean> {
//     try {
//       logger.info('Starting persistent location tracking');
//       this.deviceId = deviceId;
//       globalDeviceId = deviceId; // Store globally for background task

//       // Check permissions
//       const { status } = await Location.getForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         logger.error('Location permission not granted');
//         return false;
//       }

//       // For background tracking, need background permission
//       const backgroundStatus = await Location.getBackgroundPermissionsAsync();
//       if (backgroundStatus.status !== 'granted') {
//         logger.warn('Background location permission not granted');
//         // Continue anyway for foreground tracking
//       }

//       // Define background task if not already defined
//       const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
//       if (!isTaskDefined) {
//         this.defineLocationTask();
//       }

//       // Fetch interval from backend if not provided
//       let updateInterval = intervalOverride || 10000; // Default 10 seconds

//       if (!intervalOverride) {
//         try {
//           const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/admn-setting`);
//           if (response.ok) {
//             const data = await response.json();
//             const intervalSecs = data?.data?.attributes?.getOnlineDriverCurrentLocationCronIntervalInSecs || 10;
//             updateInterval = intervalSecs * 1000;
//             logger.info(`Using location interval from backend: ${intervalSecs}s`);
//           }
//         } catch (error) {
//           logger.warn('Could not fetch location interval from backend, using default');
//         }
//       }

//       // Configuration following Google's best practices
//       const config: LocationConfig = {
//         accuracy: Location.Accuracy.High,
//         timeInterval: updateInterval,
//         distanceInterval: 10,
//         showsBackgroundLocationIndicator: true,
//         foregroundService: Platform.OS === 'android' ? {
//           notificationTitle: 'Okra App: You\'re Online',
//           notificationBody: 'Receiving ride requests in your area',
//           notificationColor: '#FF6B00',
//         } : undefined,
//       };

//       // Start background location updates
//       await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
//         accuracy: config.accuracy,
//         timeInterval: config.timeInterval,
//         distanceInterval: config.distanceInterval,
//         showsBackgroundLocationIndicator: config.showsBackgroundLocationIndicator,
//         foregroundService: config.foregroundService,
//         // Android-specific
//         deferredUpdatesInterval: Platform.OS === 'android' ? 5000 : undefined,
//         // iOS-specific
//         activityType: Platform.OS === 'ios' ? Location.ActivityType.AutomotiveNavigation : undefined,
//         pausesUpdatesAutomatically: false,
//       });

//       this.isTracking = true;
//       logger.info('✅ Persistent location tracking started');
//       return true;
//     } catch (error) {
//       logger.error('Error starting persistent tracking:', error);
//       return false;
//     }
//   }

//   /**
//    * Define background location task
//    * This runs even when app is backgrounded/minimized
//    */
//   private defineLocationTask() {
//     TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
//       if (error) {
//         logger.error('Location task error:', error);
//         return;
//       }

//       if (data) {
//         const { locations } = data;
//         if (locations && locations.length > 0) {
//           const location = locations[0];
          
//           logger.debug('Background location update:', {
//             lat: location.coords.latitude,
//             lng: location.coords.longitude,
//             accuracy: location.coords.accuracy,
//           });

//           // Use global deviceId since 'this' context is not available in background task
//           const deviceId = globalDeviceId;
          
//           if (!deviceId) {
//             logger.error('Device ID not set for background location tracking');
//             return;
//           }

//           // Stream location to backend via WebSocket - using same pattern as getCurrentLocation
//           if (DeviceSocketService.isConnected()) {
//             try {
//               await DeviceSocketService.emit('device:location:update', {
//                 deviceId: deviceId,
//                 location: {
//                   lat: location.coords.latitude,
//                   lng: location.coords.longitude,
//                   accuracy: location.coords.accuracy,
//                   altitude: location.coords.altitude,
//                   altitudeAccuracy: location.coords.altitudeAccuracy,
//                   heading: location.coords.heading,
//                   speed: location.coords.speed,
//                 },
//                 timestamp: location.timestamp,
//               });

//               logger.debug('Background location sent to backend via socket');
//             } catch (error) {
//               logger.error('Error sending background location to backend:', error);
//             }
//           } else {
//             logger.warn('Socket not connected, background location update queued');
//             // TODO: Queue for later if needed
//           }
//         }
//       }
//     });

//     logger.info('Location task defined');
//   }

//   /**
//    * Stop persistent tracking
//    */
//   async stopPersistentTracking(): Promise<void> {
//     try {
//       logger.info('Stopping persistent location tracking');

//       const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
//       if (isTaskDefined) {
//         const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
//         if (hasStarted) {
//           await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
//         }
//       }

//       if (this.watchSubscription) {
//         this.watchSubscription.remove();
//         this.watchSubscription = null;
//       }

//       this.isTracking = false;
//       this.deviceId = null;
//       globalDeviceId = null; // Clear global device ID
      
//       logger.info('✅ Location tracking stopped');
//     } catch (error) {
//       logger.error('Error stopping location tracking:', error);
//     }
//   }

//   /**
//    * Get current location (one-time)
//    */
//   async getCurrentLocation(): Promise<Location.LocationObject | null> {
//     try {
//       const { status } = await Location.getForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         logger.error('Location permission not granted');
//         return null;
//       }

//       const location = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.High,
//       });

//       logger.debug('Got current location:', {
//         lat: location.coords.latitude,
//         lng: location.coords.longitude,
//       });

//       // Stream location to backend via WebSocket - only if deviceId is set
//       if (this.deviceId && DeviceSocketService.isConnected()) {
//         await this.sendLocationUpdate(location, this.deviceId);
//       } else if (!this.deviceId) {
//         logger.warn('Device ID not set, cannot send location update');
//       } else {
//         logger.warn('Socket not connected, location update not sent');
//       }

//       return location;
//     } catch (error) {
//       logger.error('Error getting current location:', error);
//       return null;
//     }
//   }

//   /**
//    * Set device ID (called during initialization or when going online)
//    */
//   setDeviceId(deviceId: string): void {
//     this.deviceId = deviceId;
//     globalDeviceId = deviceId;
//     logger.info('Device ID set for LocationService:', deviceId);
//   }

//   /**
//    * Check if currently tracking
//    */
//   isCurrentlyTracking(): boolean {
//     return this.isTracking;
//   }

//   /**
//    * Start foreground location watching (for when app is active)
//    */
//   async startForegroundWatch(callback: (location: Location.LocationObject) => void): Promise<void> {
//     try {
//       if (this.watchSubscription) {
//         this.watchSubscription.remove();
//       }

//       this.watchSubscription = await Location.watchPositionAsync(
//         {
//           accuracy: Location.Accuracy.High,
//           timeInterval: 3000, // More frequent when in foreground
//           distanceInterval: 5,
//         },
//         callback
//       );

//       logger.info('Foreground location watch started');
//     } catch (error) {
//       logger.error('Error starting foreground watch:', error);
//     }
//   }

//   /**
//    * Stop foreground watch
//    */
//   stopForegroundWatch(): void {
//     if (this.watchSubscription) {
//       this.watchSubscription.remove();
//       this.watchSubscription = null;
//       logger.info('Foreground location watch stopped');
//     }
//   }
// }

// export default new LocationService();
