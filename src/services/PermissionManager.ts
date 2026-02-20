//OkraApp\src\services\PermissionManager.ts
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert } from 'react-native';
import { logger } from '../utils/logger';
import * as IntentLauncher from 'expo-intent-launcher';

interface PermissionStatus {
  location: boolean;
  backgroundLocation: boolean;
  notification: boolean;
  drawOver: boolean;
  batteryOptimization: boolean;
}

class PermissionManager {
  /**
   * Request all critical permissions for a frontend
   */
  async requestCriticalPermissions(frontendName: string): Promise<PermissionStatus> {
    logger.info(`Requesting critical permissions for ${frontendName}`);

    const permissions: PermissionStatus = {
      location: false,
      backgroundLocation: false,
      notification: false,
      drawOver: false,
      batteryOptimization: false,
    };

    // 1. Foreground location (required for all)
    permissions.location = await this.requestLocationPermission();

    // 2. Background location (required for drivers, conductors, delivery)
    if (frontendName !== 'rider') {
      permissions.backgroundLocation = await this.requestBackgroundLocationPermission();
    }

    // 3. Notifications (required for all)
    permissions.notification = await this.requestNotificationPermission();

    // 4. Draw over apps (Android only, not for riders)
    if (Platform.OS === 'android' && frontendName !== 'rider') {
      permissions.drawOver = await this.requestDrawOverPermission();
    }

    // 5. Battery optimization (Android only, not for riders)
    if (Platform.OS === 'android' && frontendName !== 'rider') {
      permissions.batteryOptimization = await this.requestBatteryOptimizationExemption();
    }

    logger.info('Permission request results:', permissions);
    return permissions;
  }

  /**
   * Request foreground location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      logger.info('Requesting foreground location permission');

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        logger.info('✅ Foreground location permission granted');
        return true;
      }

      logger.warn('Foreground location permission denied');
      return false;
    } catch (error) {
      logger.error('Error requesting foreground location permission:', error);
      return false;
    }
  }

  /**
   * Request background location permission
   */
  async requestBackgroundLocationPermission(): Promise<boolean> {
    try {
      logger.info('Requesting background location permission');

      // First check if foreground permission is granted
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        logger.warn('Foreground permission must be granted first');
        return false;
      }

      // Request background permission
      const { status } = await Location.requestBackgroundPermissionsAsync();

      if (status === 'granted') {
        logger.info('✅ Background location permission granted');
        return true;
      }

      // Show educational alert for "Allow all the time"
      if (Platform.OS === 'android') {
        Alert.alert(
          'Background Location Required',
          'For Okra Rides to work properly, you need to allow location access "All the time" in your device settings.\n\nThis allows you to receive ride requests even when the app is in the background.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => this.openAppSettings(),
            },
          ]
        );
      } else if (Platform.OS === 'ios') {
        Alert.alert(
          'Background Location Required',
          'Please select "Always Allow" when prompted, or go to Settings > Okra Rides > Location and select "Always".',
          [
            { text: 'OK' },
          ]
        );
      }

      logger.warn('Background location permission denied');
      return false;
    } catch (error) {
      logger.error('Error requesting background location permission:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    try {
      logger.info('Requesting notification permission');

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        logger.info('✅ Notification permission granted');
        return true;
      }

      logger.warn('Notification permission denied');
      return false;
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Request draw over apps permission (Android only)
   */
  async requestDrawOverPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      logger.info('Requesting draw over apps permission');

      Alert.alert(
        'Display Over Other Apps',
        'Okra Rides needs permission to display ride requests over other apps. This allows you to see incoming ride requests even when using navigation apps.\n\nYou can disable this later in settings.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Grant Permission',
            onPress: async () => {
              try {
                // Open Android settings for SYSTEM_ALERT_WINDOW
                await IntentLauncher.startActivityAsync(
                  IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION,
                  {
                    data: 'package:com.okraapp', // Your package name
                  }
                );
              } catch (error) {
                logger.error('Error opening overlay permission settings:', error);
              }
            },
          },
        ]
      );

      // Check permission status (will require user to come back to app)
      // Note: Checking SYSTEM_ALERT_WINDOW permission requires native code
      // For now, we'll assume permission is granted if user went to settings
      return true;
    } catch (error) {
      logger.error('Error requesting draw over permission:', error);
      return false;
    }
  }

  /**
   * Request battery optimization exemption (Android only)
   */
  async requestBatteryOptimizationExemption(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      logger.info('Requesting battery optimization exemption');

      Alert.alert(
        'Battery Optimization',
        'To ensure you receive ride requests reliably, Okra Rides needs to be excluded from battery optimization.\n\nThis prevents Android from restricting the app in the background.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                await IntentLauncher.startActivityAsync(
                  IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                  {
                    data: 'package:com.okraapp',
                  }
                );
              } catch (error) {
                logger.error('Error opening battery optimization settings:', error);
              }
            },
          },
        ]
      );

      return true;
    } catch (error) {
      logger.error('Error requesting battery optimization exemption:', error);
      return false;
    }
  }

  /**
   * Check specific permission
   */
  async check(permissionType: string): Promise<string> {
    try {
      switch (permissionType) {
        case 'location':
          const { status } = await Location.getForegroundPermissionsAsync();
          return status;

        case 'backgroundLocation':
          const bgStatus = await Location.getBackgroundPermissionsAsync();
          return bgStatus.status;

        case 'notification':
          const notifStatus = await Notifications.getPermissionsAsync();
          return notifStatus.status;

        default:
          return 'unsupported';
      }
    } catch (error) {
      logger.error(`Error checking ${permissionType} permission:`, error);
      return 'denied';
    }
  }

  /**
   * Request specific permission
   */
  async request(permissionType: string): Promise<string> {
    try {
      switch (permissionType) {
        case 'location':
          const granted = await this.requestLocationPermission();
          return granted ? 'granted' : 'denied';

        case 'backgroundLocation':
          const bgGranted = await this.requestBackgroundLocationPermission();
          return bgGranted ? 'granted' : 'denied';

        case 'notification':
          const notifGranted = await this.requestNotificationPermission();
          return notifGranted ? 'granted' : 'denied';

        case 'drawOver':
          const drawGranted = await this.requestDrawOverPermission();
          return drawGranted ? 'granted' : 'denied';

        default:
          return 'unsupported';
      }
    } catch (error) {
      logger.error(`Error requesting ${permissionType} permission:`, error);
      return 'denied';
    }
  }

  /**
   * Check draw over permission (Android only)
   */
  async checkDrawOverPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    // This requires native module to properly check SYSTEM_ALERT_WINDOW
    // For now, we'll assume it's granted if user has gone through setup
    // Proper implementation would use a native module
    return true;
  }

  /**
   * Open app settings
   */
  async openAppSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
          {
            data: 'package:com.okraapp',
          }
        );
      }
    } catch (error) {
      logger.error('Error opening app settings:', error);
      Alert.alert('Error', 'Could not open settings');
    }
  }
}

export default new PermissionManager();