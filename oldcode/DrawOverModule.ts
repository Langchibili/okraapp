// // //OkraApp\src\services\DrawOverModule.ts
// // import { NativeModules, Platform } from 'react-native';
// // import { logger } from '../utils/logger';

// // const { DrawOverNativeModule } = NativeModules;

// // interface DrawOverData {
// //   rideId: number | string;
// //   rideCode: string;
// //   pickupAddress: string;
// //   dropoffAddress: string;
// //   estimatedFare: number;
// //   distance: number;
// //   riderName: string;
// //   autoTimeout: number;
// // }

// // class DrawOverModule {
// //   /**
// //    * Show draw-over overlay
// //    */
// //   async show(data: DrawOverData): Promise<void> {
// //     if (Platform.OS !== 'android') {
// //       logger.warn('Draw-over only supported on Android');
// //       return;
// //     }

// //     try {
// //       logger.info('Showing draw-over overlay:', data);

// //       if (!DrawOverNativeModule) {
// //         logger.error('DrawOverNativeModule not available');
// //         return;
// //       }

// //       await DrawOverNativeModule.showOverlay(data);
      
// //       logger.info('Draw-over overlay shown');
// //     } catch (error) {
// //       logger.error('Error showing draw-over overlay:', error);
// //     }
// //   }

// //   /**
// //    * Hide draw-over overlay
// //    */
// //   async hide(): Promise<void> {
// //     if (Platform.OS !== 'android') {
// //       return;
// //     }

// //     try {
// //       if (!DrawOverNativeModule) {
// //         return;
// //       }

// //       await DrawOverNativeModule.hideOverlay();
      
// //       logger.info('Draw-over overlay hidden');
// //     } catch (error) {
// //       logger.error('Error hiding draw-over overlay:', error);
// //     }
// //   }

// //   /**
// //    * Check if overlay is showing
// //    */
// //   async isShowing(): Promise<boolean> {
// //     if (Platform.OS !== 'android') {
// //       return false;
// //     }

// //     try {
// //       if (!DrawOverNativeModule) {
// //         return false;
// //       }

// //       return await DrawOverNativeModule.isOverlayShowing();
// //     } catch (error) {
// //       logger.error('Error checking overlay status:', error);
// //       return false;
// //     }
// //   }
// // }

// // export default new DrawOverModule();
// //OkraApp\src\services\DrawOverModule.ts
// import { NativeModules, Platform } from 'react-native';
// import { logger } from '../utils/logger';

// const { DrawOverNativeModule } = NativeModules;

// interface DrawOverData {
//   rideId: number | string;
//   rideCode: string;
//   pickupAddress: string;
//   dropoffAddress: string;
//   estimatedFare: number;
//   distance: number;
//   riderName: string;
//   autoTimeout: number;
// }

// class DrawOverModule {
//   /**
//    * Check if native module is available
//    */
//   private isModuleAvailable(): boolean {
//     if (Platform.OS !== 'android') {
//       return false;
//     }

//     if (!DrawOverNativeModule) {
//       logger.error('❌ DrawOverNativeModule is not available. Make sure the native module is properly linked.');
//       logger.error('Run: cd android && ./gradlew clean && cd .. && npx react-native run-android');
//       return false;
//     }

//     return true;
//   }

//   /**
//    * Validate data before showing overlay
//    */
//   private validateData(data: DrawOverData): boolean {
//     const requiredFields = ['rideId', 'rideCode', 'pickupAddress', 'dropoffAddress', 'estimatedFare', 'distance', 'riderName', 'autoTimeout'];
    
//     for (const field of requiredFields) {
//       if (data[field as keyof DrawOverData] === undefined || data[field as keyof DrawOverData] === null) {
//         logger.error(`❌ Missing required field: ${field}`);
//         return false;
//       }
//     }

//     return true;
//   }

//   /**
//    * Show draw-over overlay
//    */
//   async show(data: DrawOverData): Promise<void> {
//     if (Platform.OS !== 'android') {
//       logger.warn('⚠️ Draw-over only supported on Android');
//       return;
//     }

//     try {
//       logger.info('📱 Attempting to show draw-over overlay...');
//       logger.info('📊 Data received:', JSON.stringify(data, null, 2));

//       // Check if module is available
//       if (!this.isModuleAvailable()) {
//         logger.error('❌ Cannot show overlay - native module not available');
//         return;
//       }

//       // Validate data
//       if (!this.validateData(data)) {
//         logger.error('❌ Cannot show overlay - data validation failed');
//         logger.error('Received data:', JSON.stringify(data, null, 2));
//         return;
//       }

//       logger.info('✅ Data validated successfully');
//       logger.info('🔄 Calling native module...');

//       // Call native module
//       await DrawOverNativeModule.showOverlay(data);
      
//       logger.info('✅ Draw-over overlay shown successfully');
//     } catch (error) {
//       logger.error('❌ Error showing draw-over overlay:', error);
      
//       if (error instanceof Error) {
//         logger.error('Error details:', {
//           name: error.name,
//           message: error.message,
//           stack: error.stack,
//         });
//       }
      
//       // Try to get more info from native module
//       try {
//         const isShowing = await this.isShowing();
//         logger.info('Overlay showing status:', isShowing);
//       } catch (statusError) {
//         logger.error('Could not check overlay status:', statusError);
//       }
//     }
//   }

//   /**
//    * Hide draw-over overlay
//    */
//   async hide(): Promise<void> {
//     if (Platform.OS !== 'android') {
//       return;
//     }

//     try {
//       if (!this.isModuleAvailable()) {
//         return;
//       }

//       await DrawOverNativeModule.hideOverlay();
      
//       logger.info('✅ Draw-over overlay hidden');
//     } catch (error) {
//       logger.error('❌ Error hiding draw-over overlay:', error);
//     }
//   }

//   /**
//    * Check if overlay is showing
//    */
//   async isShowing(): Promise<boolean> {
//     if (Platform.OS !== 'android') {
//       return false;
//     }

//     try {
//       if (!this.isModuleAvailable()) {
//         return false;
//       }

//       const showing = await DrawOverNativeModule.isOverlayShowing();
//       logger.info('Overlay showing:', showing);
//       return showing;
//     } catch (error) {
//       logger.error('❌ Error checking overlay status:', error);
//       return false;
//     }
//   }
// }

