//OkraApp\src\services\BackgroundService.ts
// export default new BackgroundService();
import { Platform } from 'react-native';
import LocationService from './LocationService';
import DeviceSocketService from './DeviceSocketService';
import NotificationService from './NotificationService';
import AudioService from './AudioService';
import PermissionManager from './PermissionManager';
import { logger } from '../utils/logger';

interface ServiceConfig {
  deviceId: string;
  userId: string | number;
  frontendName: string;
  socketServerUrl: string;
}

class BackgroundService {
  private isRunning: boolean = false;
  private config: ServiceConfig | null = null;

  /**
   * Start all background services
   */
  async start(config: ServiceConfig): Promise<boolean> {
    try {
      logger.info('Starting background services');

      if (this.isRunning) {
        logger.warn('Background services already running');
        return true;
      }

      this.config = config;

      // 1. Initialize audio service
      await AudioService.initialize();

      // 2. Notification service is initialized in App.tsx with WebView callback
      logger.info('Notification service already initialized');

      // 3. Connect to device socket
      const socketConnected = await DeviceSocketService.connect(config.socketServerUrl);
      if (!socketConnected) {
        logger.error('Failed to connect to device socket');
        return false;
      }

      // 4. Register device with backend
      const notificationToken = NotificationService.getToken();
      const deviceInfo = await this.getDeviceInfo();

      await DeviceSocketService.registerDevice({
        deviceId: config.deviceId,
        userId: config.userId,
        userType: this.getUserType(config.frontendName),
        frontendName: config.frontendName,
        notificationToken,
        deviceInfo,
        socketServerUrl: config.socketServerUrl,
      });

      // 5. Start persistent location tracking (for non-riders)
      if (config.frontendName !== 'rider') {
        const trackingStarted = await LocationService.startPersistentTracking(config.deviceId);
        
        if (!trackingStarted) {
          logger.error('Failed to start location tracking');
          return false;
        }
      }

      this.isRunning = true;
      logger.info('✅ Background services started successfully');

      return true;
    } catch (error) {
      logger.error('Error starting background services:', error);
      return false;
    }
  }

  /**
   * Stop all background services
   */
  async stop(): Promise<void> {
    try {
      logger.info('Stopping background services');

      // Stop location tracking
      await LocationService.stopPersistentTracking();

      // Disconnect socket
      DeviceSocketService.disconnect();

      // Stop audio
      await AudioService.stopAlert();

      // Cancel notifications
      await NotificationService.cancelAll();

      this.isRunning = false;
      logger.info('✅ Background services stopped');
    } catch (error) {
      logger.error('Error stopping background services:', error);
    }
  }

  /**
   * Show ride request (using notification instead of draw-over)
   */
  async showRideRequest(rideData: any): Promise<void> {
    try {
      logger.info('📱 Showing ride request notification');
      logger.info('📊 Ride data:', JSON.stringify(rideData, null, 2));

      // Transform data to match notification format
      const notificationData = {
        rideId: rideData.rideId || rideData.id,
        rideCode: rideData.rideCode || `RIDE-${rideData.rideId}`,
        riderName: rideData.riderName || 'Rider',
        pickupAddress: rideData.pickupLocation?.address || 
                      rideData.pickupLocation?.name || 
                      rideData.pickupAddress || 
                      'Pickup location',
        dropoffAddress: rideData.dropoffLocation?.address || 
                       rideData.dropoffLocation?.name || 
                       rideData.dropoffAddress || 
                       'Dropoff location',
        estimatedFare: rideData.estimatedFare || 0,
        distance: rideData.distance || 0,
        pickupLocation: rideData.pickupLocation,
        dropoffLocation: rideData.dropoffLocation,
      };

      logger.info('📤 Transformed notification data:', JSON.stringify(notificationData, null, 2));

      // Play audio alert
      await AudioService.playAlert('ride_request');

      // Show notification
      await NotificationService.showRideRequest(notificationData);

      logger.info('✅ Ride request notification shown successfully');
    } catch (error) {
      logger.error('❌ Error showing ride request:', error);
      
      if (error instanceof Error) {
        logger.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
    }
  }

  /**
   * Ensure foreground service is running (Android only)
   */
  async ensureForegroundService(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Check if location tracking is running
      const isTracking = LocationService.isCurrentlyTracking();
      
      if (!isTracking && this.config) {
        logger.info('Restarting location tracking (foreground service)');
        await LocationService.startPersistentTracking(this.config.deviceId);
      }
    } catch (error) {
      logger.error('Error ensuring foreground service:', error);
    }
  }

  /**
   * Get device info
   */
  private async getDeviceInfo(): Promise<any> {
    const { getDeviceInfo } = require('../utils/device-info');
    return await getDeviceInfo();
  }

  /**
   * Get user type from frontend name
   */
  private getUserType(frontendName: string): 'driver' | 'rider' | 'conductor' | 'delivery' {
    switch (frontendName) {
      case 'driver':
        return 'driver';
      case 'rider':
        return 'rider';
      case 'conductor':
        return 'conductor';
      case 'delivery':
        return 'delivery';
      default:
        return 'driver';
    }
  }

  /**
   * Check if services are running
   */
  isServicesRunning(): boolean {
    return this.isRunning;
  }
}

export default new BackgroundService();