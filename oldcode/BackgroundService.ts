// // //OkraApp\src\services\BackgroundService.ts
// // import { Platform } from 'react-native';
// // import LocationService from './LocationService';
// // import DeviceSocketService from './DeviceSocketService';
// // import NotificationService from './NotificationService';
// // import AudioService from './AudioService';
// // import PermissionManager from './PermissionManager';
// // import { logger } from '../utils/logger';

// // interface ServiceConfig {
// //   deviceId: string;
// //   userId: string | number;
// //   frontendName: string;
// //   socketServerUrl: string;
// // }

// // class BackgroundService {
// //   private isRunning: boolean = false;
// //   private config: ServiceConfig | null = null;

// //   /**
// //    * Start all background services
// //    */
// //   async start(config: ServiceConfig): Promise<boolean> {
// //     try {
// //       logger.info('Starting background services');

// //       if (this.isRunning) {
// //         logger.warn('Background services already running');
// //         return true;
// //       }

// //       this.config = config;

// //       // 1. Initialize audio service
// //       await AudioService.initialize();

// //       // 2. Connect to device socket
// //       const socketConnected = await DeviceSocketService.connect(config.socketServerUrl);
// //       if (!socketConnected) {
// //         logger.error('Failed to connect to device socket');
// //         return false;
// //       }

// //       // 3. Register device with backend
// //       const notificationToken = NotificationService.getToken();
// //       const deviceInfo = await this.getDeviceInfo();

// //       await DeviceSocketService.registerDevice({
// //         deviceId: config.deviceId,
// //         userId: config.userId,
// //         userType: this.getUserType(config.frontendName),
// //         frontendName: config.frontendName,
// //         notificationToken,
// //         deviceInfo,
// //         socketServerUrl: config.socketServerUrl,
// //       });

// //       // 4. Start persistent location tracking (for non-riders)
// //       if (config.frontendName !== 'rider') {
// //         const trackingStarted = await LocationService.startPersistentTracking(config.deviceId);
        
// //         if (!trackingStarted) {
// //           logger.error('Failed to start location tracking');
// //           return false;
// //         }
// //       }

// //       this.isRunning = true;
// //       logger.info('✅ Background services started successfully');

// //       return true;
// //     } catch (error) {
// //       logger.error('Error starting background services:', error);
// //       return false;
// //     }
// //   }

// //   /**
// //    * Stop all background services
// //    */
// //   async stop(): Promise<void> {
// //     try {
// //       logger.info('Stopping background services');

// //       // Stop location tracking
// //       await LocationService.stopPersistentTracking();

// //       // Disconnect socket
// //       DeviceSocketService.disconnect();

// //       // Stop audio
// //       await AudioService.stopAlert();

// //       this.isRunning = false;
// //       logger.info('✅ Background services stopped');
// //     } catch (error) {
// //       logger.error('Error stopping background services:', error);
// //     }
// //   }

// //   /**
// //    * Show draw-over overlay (Android only)
// //    */
// //   async showDrawOver(overlayData: any): Promise<void> {
// //     if (Platform.OS !== 'android') {
// //       logger.warn('Draw-over only supported on Android');
// //       return;
// //     }

// //     try {
// //       logger.info('Showing draw-over overlay');

// //       // Check permission
// //       const hasPermission = await PermissionManager.checkDrawOverPermission();
      
// //       if (!hasPermission) {
// //         logger.warn('Draw-over permission not granted');
// //         return;
// //       }

// //       // Play audio alert first
// //       await AudioService.playAlert('ride_request');

// //       // Show overlay via native module
// //       // This would be implemented in DrawOverModule
// //       const DrawOverModule = require('../modules/DrawOverModule').default;
// //       await DrawOverModule.show(overlayData);

// //       logger.info('Draw-over overlay shown');
// //     } catch (error) {
// //       logger.error('Error showing draw-over:', error);
// //     }
// //   }

// //   /**
// //    * Ensure foreground service is running (Android only)
// //    */
// //   async ensureForegroundService(): Promise<void> {
// //     if (Platform.OS !== 'android') {
// //       return;
// //     }

// //     try {
// //       // Check if location tracking is running
// //       const isTracking = LocationService.isCurrentlyTracking();
      
// //       if (!isTracking && this.config) {
// //         logger.info('Restarting location tracking (foreground service)');
// //         await LocationService.startPersistentTracking(this.config.deviceId);
// //       }
// //     } catch (error) {
// //       logger.error('Error ensuring foreground service:', error);
// //     }
// //   }

// //   /**
// //    * Get device info
// //    */
// //   private async getDeviceInfo(): Promise<any> {
// //     const { getDeviceInfo } = require('../utils/device-info');
// //     return await getDeviceInfo();
// //   }

// //   /**
// //    * Get user type from frontend name
// //    */
// //   private getUserType(frontendName: string): 'driver' | 'rider' | 'conductor' | 'delivery' {
// //     switch (frontendName) {
// //       case 'driver':
// //         return 'driver';
// //       case 'rider':
// //         return 'rider';
// //       case 'conductor':
// //         return 'conductor';
// //       case 'delivery':
// //         return 'delivery';
// //       default:
// //         return 'driver';
// //     }
// //   }

// //   /**
// //    * Check if services are running
// //    */
// //   isServicesRunning(): boolean {
// //     return this.isRunning;
// //   }
// // }

// // export default new BackgroundService();
// //OkraApp\src\services\BackgroundService.ts
// import { Platform } from 'react-native';
// import LocationService from './LocationService';
// import DeviceSocketService from './DeviceSocketService';
// import NotificationService from './NotificationService';
// import AudioService from './AudioService';
// import PermissionManager from './PermissionManager';
// import DrawOverModule from './DrawOverModule'; // Add this import
// import { logger } from '../utils/logger';

// interface ServiceConfig {
//   deviceId: string;
//   userId: string | number;
//   frontendName: string;
//   socketServerUrl: string;
// }

// class BackgroundService {
//   private isRunning: boolean = false;
//   private config: ServiceConfig | null = null;

//   /**
//    * Start all background services
//    */
//   async start(config: ServiceConfig): Promise<boolean> {
//     try {
//       logger.info('Starting background services');

//       if (this.isRunning) {
//         logger.warn('Background services already running');
//         return true;
//       }

//       this.config = config;

//       // 1. Initialize audio service
//       await AudioService.initialize();

//       // 2. Connect to device socket
//       const socketConnected = await DeviceSocketService.connect(config.socketServerUrl);
//       if (!socketConnected) {
//         logger.error('Failed to connect to device socket');
//         return false;
//       }

//       // 3. Register device with backend
//       const notificationToken = NotificationService.getToken();
//       const deviceInfo = await this.getDeviceInfo();

//       await DeviceSocketService.registerDevice({
//         deviceId: config.deviceId,
//         userId: config.userId,
//         userType: this.getUserType(config.frontendName),
//         frontendName: config.frontendName,
//         notificationToken,
//         deviceInfo,
//         socketServerUrl: config.socketServerUrl,
//       });

//       // 4. Start persistent location tracking (for non-riders)
//       if (config.frontendName !== 'rider') {
//         const trackingStarted = await LocationService.startPersistentTracking(config.deviceId);
        
//         if (!trackingStarted) {
//           logger.error('Failed to start location tracking');
//           return false;
//         }
//       }

//       this.isRunning = true;
//       logger.info('✅ Background services started successfully');

//       return true;
//     } catch (error) {
//       logger.error('Error starting background services:', error);
//       return false;
//     }
//   }

//   /**
//    * Stop all background services
//    */
//   async stop(): Promise<void> {
//     try {
//       logger.info('Stopping background services');

//       // Stop location tracking
//       await LocationService.stopPersistentTracking();

//       // Disconnect socket
//       DeviceSocketService.disconnect();

//       // Stop audio
//       await AudioService.stopAlert();

//       this.isRunning = false;
//       logger.info('✅ Background services stopped');
//     } catch (error) {
//       logger.error('Error stopping background services:', error);
//     }
//   }

//   /**
//    * Show draw-over overlay (Android only)
//    * FIXED: Transform data to match expected format
//    */
//   async showDrawOver(overlayData: any): Promise<void> {
//     if (Platform.OS !== 'android') {
//       logger.warn('Draw-over only supported on Android');
//       return;
//     }

//     try {
//       logger.info('Showing draw-over overlay with data:', JSON.stringify(overlayData, null, 2));

//       // Check permission
//       const hasPermission = await PermissionManager.checkDrawOverPermission();
      
//       if (!hasPermission) {
//         logger.warn('Draw-over permission not granted');
//         return;
//       }

//       // ✅ TRANSFORM DATA to match DrawOverModule interface
//       const transformedData = {
//         rideId: overlayData.rideId || overlayData.id,
//         rideCode: overlayData.rideCode || `RIDE-${overlayData.rideId}`,
//         pickupAddress: overlayData.pickupLocation?.address || 
//                       overlayData.pickupLocation?.name || 
//                       overlayData.pickupAddress || 
//                       'Pickup location',
//         dropoffAddress: overlayData.dropoffLocation?.address || 
//                        overlayData.dropoffLocation?.name || 
//                        overlayData.dropoffAddress || 
//                        'Dropoff location',
//         estimatedFare: overlayData.estimatedFare || 0,
//         distance: overlayData.distance || 0,
//         riderName: overlayData.riderName || 'Rider',
//         autoTimeout: overlayData.autoTimeout || 30000, // 30 seconds default
//       };

//       logger.info('Transformed data for draw-over:', JSON.stringify(transformedData, null, 2));

//       // Play audio alert first
//       await AudioService.playAlert('ride_request');

//       // Show overlay via DrawOverModule
//       await DrawOverModule.show(transformedData);

//       logger.info('✅ Draw-over overlay shown successfully');
//     } catch (error) {
//       logger.error('❌ Error showing draw-over:', error);
      
//       // Log the full error for debugging
//       if (error instanceof Error) {
//         logger.error('Error name:', error.name);
//         logger.error('Error message:', error.message);
//         logger.error('Error stack:', error.stack);
//       }
//     }
//   }

//   /**
//    * Ensure foreground service is running (Android only)
//    */
//   async ensureForegroundService(): Promise<void> {
//     if (Platform.OS !== 'android') {
//       return;
//     }

//     try {
//       // Check if location tracking is running
//       const isTracking = LocationService.isCurrentlyTracking();
      
//       if (!isTracking && this.config) {
//         logger.info('Restarting location tracking (foreground service)');
//         await LocationService.startPersistentTracking(this.config.deviceId);
//       }
//     } catch (error) {
//       logger.error('Error ensuring foreground service:', error);
//     }
//   }

//   /**
//    * Get device info
//    */
//   private async getDeviceInfo(): Promise<any> {
//     const { getDeviceInfo } = require('../utils/device-info');
//     return await getDeviceInfo();
//   }

//   /**
//    * Get user type from frontend name
//    */
//   private getUserType(frontendName: string): 'driver' | 'rider' | 'conductor' | 'delivery' {
//     switch (frontendName) {
//       case 'driver':
//         return 'driver';
//       case 'rider':
//         return 'rider';
//       case 'conductor':
//         return 'conductor';
//       case 'delivery':
//         return 'delivery';
//       default:
//         return 'driver';
//     }
//   }

//   /**
//    * Check if services are running
//    */
//   isServicesRunning(): boolean {
//     return this.isRunning;
//   }
// }
