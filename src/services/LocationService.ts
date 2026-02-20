//OkraApp/src/services/LocationService.ts (Fixed)
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import DeviceSocketService from './DeviceSocketService';
import { logger } from '../utils/logger';

const LOCATION_TASK_NAME = 'background-location-task';

interface LocationConfig {
  accuracy: Location.LocationAccuracy;
  timeInterval: number;
  distanceInterval: number;
  showsBackgroundLocationIndicator: boolean;
  foregroundService?: {
    notificationTitle: string;
    notificationBody: string;
    notificationColor: string;
  };
}

// Global variable to store deviceId for background task
let globalDeviceId: string | null = null;

class LocationService {
  private isTracking: boolean = false;
  private deviceId: string | null = null;
  private watchSubscription: Location.LocationSubscription | null = null;

  /**
   * Helper function to send location update to backend
   */
  private async sendLocationUpdate(location: Location.LocationObject, deviceId: string): Promise<void> {
    if (!DeviceSocketService.isConnected()) {
      logger.warn('Socket not connected, cannot send location update');
      return;
    }

    try {
      await DeviceSocketService.emit('device:location:update', {
        deviceId,
        location: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          altitudeAccuracy: location.coords.altitudeAccuracy,
          heading: location.coords.heading,
          speed: location.coords.speed,
        },
        timestamp: location.timestamp,
      });
      logger.debug('Location sent to backend via socket');
    } catch (error) {
      logger.error('Error sending location to backend:', error);
    }
  }

  /**
   * Start persistent location tracking (Google Best Practices 2026)
   * - Android: Uses Foreground Service
   * - iOS: Uses Background Location Session with indicator
   * 
   * IMPORTANT: Once started, this continuously sends location updates via socket
   * at the interval specified by backend admin settings (or default 10 seconds)
   * 
   * Location updates are sent as 'device:location:update' events through DeviceSocketService
   */
  async startPersistentTracking(deviceId: string, intervalOverride?: number): Promise<boolean> {
    try {
      logger.info('🚀 Starting persistent location tracking');
      this.deviceId = deviceId;
      globalDeviceId = deviceId; // Store globally for background task

      // Check permissions
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        logger.error('❌ Location permission not granted');
        return false;
      }

      // For background tracking, need background permission
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        logger.warn('⚠️ Background location permission not granted - tracking may be limited');
        // Continue anyway for foreground tracking
      }

      // Define background task if not already defined
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (!isTaskDefined) {
        this.defineLocationTask();
      }

      // Fetch interval from backend if not provided
      let updateInterval = intervalOverride || 10000; // Default 10 seconds

      if (!intervalOverride) {
        try {
          logger.info('📡 Fetching location update interval from backend...');
          const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/admn-setting`);
          if (response.ok) {
            const data = await response.json();
            const intervalSecs = data?.data?.attributes?.getOnlineDriverCurrentLocationCronIntervalInSecs || 10;
            updateInterval = intervalSecs * 1000;
            logger.info(`✅ Using location interval from backend: ${intervalSecs}s (${updateInterval}ms)`);
          } else {
            logger.warn(`⚠️ Backend returned status ${response.status}, using default interval: 10s`);
          }
        } catch (error) {
          logger.warn('⚠️ Could not fetch location interval from backend, using default: 10s', error);
        }
      } else {
        logger.info(`📍 Using override interval: ${intervalOverride}ms`);
      }

      // Configuration following Google's best practices
      const config: LocationConfig = {
        accuracy: Location.Accuracy.High,
        timeInterval: updateInterval, // Continuous updates at this interval
        distanceInterval: 10, // OR if device moves 10+ meters
        showsBackgroundLocationIndicator: true,
        foregroundService: Platform.OS === 'android' ? {
          notificationTitle: 'Okra App: You\'re Online',
          notificationBody: 'Receiving ride requests in your area',
          notificationColor: '#FF6B00',
        } : undefined,
      };

      logger.info('📍 Location tracking configuration:', {
        interval: `${updateInterval}ms (${updateInterval / 1000}s)`,
        distanceInterval: '10m',
        accuracy: 'High',
        platform: Platform.OS,
      });

      // Start background location updates
      // This will trigger the background task continuously based on:
      // - timeInterval: every N seconds
      // - distanceInterval: OR when device moves 10+ meters
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: config.accuracy,
        timeInterval: config.timeInterval,
        distanceInterval: config.distanceInterval,
        showsBackgroundLocationIndicator: config.showsBackgroundLocationIndicator,
        foregroundService: config.foregroundService,
        // Android-specific
        deferredUpdatesInterval: Platform.OS === 'android' ? 5000 : undefined,
        // iOS-specific
        activityType: Platform.OS === 'ios' ? Location.ActivityType.AutomotiveNavigation : undefined,
        pausesUpdatesAutomatically: false, // Never pause - always track
      });

      this.isTracking = true;
      logger.info('✅ Persistent location tracking started successfully');
      logger.info(`📡 Location updates will be sent every ${updateInterval / 1000}s via socket`);
      logger.info('🔄 Background task will continuously emit "device:location:update" events');
      
      return true;
    } catch (error) {
      logger.error('❌ Error starting persistent tracking:', error);
      return false;
    }
  }

  /**
   * Define background location task
   * This runs continuously when tracking is active (user is online)
   * Sends location updates via socket at the configured interval
   */
  private defineLocationTask() {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
      if (error) {
        logger.error('❌ Background location task error:', error);
        return;
      }

      if (!data) {
        logger.warn('No data received in background location task');
        return;
      }

      const { locations } = data;
      if (!locations || locations.length === 0) {
        logger.warn('No locations in background task data');
        return;
      }

      // Process the most recent location
      const location = locations[0];
      
      logger.debug('📍 Background location received:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp).toISOString(),
      });

      // Use global deviceId since 'this' context is not available in background task
      const deviceId = globalDeviceId;
      
      if (!deviceId) {
        logger.error('❌ Device ID not set - cannot send background location update');
        return;
      }

      // Check socket connection before sending
      if (!DeviceSocketService.isConnected()) {
        logger.warn('⚠️ Socket disconnected - background location update skipped');
        // TODO: Implement queue for offline updates if needed
        return;
      }

      // Send location update to backend via WebSocket
      // This happens continuously based on timeInterval/distanceInterval settings
      try {
        await DeviceSocketService.emit('device:location:update', {
          deviceId: deviceId,
          location: {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            altitudeAccuracy: location.coords.altitudeAccuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
          },
          timestamp: location.timestamp,
        });

        logger.debug('✅ Background location sent to backend via socket', {
          deviceId,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } catch (error) {
        logger.error('❌ Error sending background location to backend:', error);
        // Continue running - don't stop tracking on socket errors
      }
    });

    logger.info('✅ Background location task defined - will send updates continuously when tracking is active');
  }

  /**
   * Stop persistent tracking
   * 
   * This stops the continuous location updates and socket emissions
   * Called when:
   * - Driver goes offline
   * - App is being closed
   * - User manually stops tracking
   */
  async stopPersistentTracking(): Promise<void> {
    try {
      logger.info('🛑 Stopping persistent location tracking...');

      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (isTaskDefined) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          logger.info('✅ Background location updates stopped');
        } else {
          logger.info('ℹ️ Background location updates were not running');
        }
      } else {
        logger.info('ℹ️ Location task was not defined');
      }

      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
        logger.info('✅ Foreground location watch stopped');
      }

      this.isTracking = false;
      this.deviceId = null;
      globalDeviceId = null; // Clear global device ID
      
      logger.info('✅ Location tracking stopped completely');
      logger.info('📡 Continuous socket emissions stopped');
    } catch (error) {
      logger.error('❌ Error stopping location tracking:', error);
    }
  }

  /**
   * Get current location (one-time request)
   * 
   * This is used for:
   * - Initial location when going online
   * - On-demand location requests from backend (via socket 'getCurrentLocation' event)
   * - Manual location requests from the app
   * 
   * Note: For continuous location tracking, use startPersistentTracking() which
   * automatically sends updates at configured intervals via background task
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        logger.error('❌ Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      logger.debug('📍 Got current location:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      // Send location to backend via WebSocket (one-time)
      // Background tracking (if active) handles continuous updates separately
      if (this.deviceId && DeviceSocketService.isConnected()) {
        await this.sendLocationUpdate(location, this.deviceId);
        logger.debug('✅ One-time location update sent to backend');
      } else if (!this.deviceId) {
        logger.warn('⚠️ Device ID not set, cannot send location update');
      } else {
        logger.warn('⚠️ Socket not connected, location update not sent');
      }

      return location;
    } catch (error) {
      logger.error('❌ Error getting current location:', error);
      return null;
    }
  }

  /**
   * Set device ID (called during initialization or when going online)
   */
  setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
    globalDeviceId = deviceId;
    logger.info('Device ID set for LocationService:', deviceId);
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Start foreground location watching (for when app is active)
   */
  async startForegroundWatch(callback: (location: Location.LocationObject) => void): Promise<void> {
    try {
      if (this.watchSubscription) {
        this.watchSubscription.remove();
      }

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // More frequent when in foreground
          distanceInterval: 5,
        },
        callback
      );

      logger.info('Foreground location watch started');
    } catch (error) {
      logger.error('Error starting foreground watch:', error);
    }
  }

  /**
   * Stop foreground watch
   */
  stopForegroundWatch(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
      logger.info('Foreground location watch stopped');
    }
  }
}

export default new LocationService();