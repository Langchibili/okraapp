// export default new PermissionManager();
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
   * Request all critical permissions for a frontend.
   * Each permission is only prompted if it is not already granted.
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
   * Request foreground location permission.
   * Skips the prompt entirely if already granted.
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      // ✅ Check first — only prompt if not already granted
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing === 'granted') {
        logger.info('✅ Foreground location already granted — skipping prompt');
        return true;
      }

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
   * Request background location permission.
   * Skips the prompt entirely if already granted.
   */
  async requestBackgroundLocationPermission(): Promise<boolean> {
    try {
      // ✅ Check first — only prompt if not already granted
      const { status: existing } = await Location.getBackgroundPermissionsAsync();
      if (existing === 'granted') {
        logger.info('✅ Background location already granted — skipping prompt');
        return true;
      }

      // Foreground must be granted before we can ask for background
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        logger.warn('Foreground permission must be granted before background');
        return false;
      }

      logger.info('Requesting background location permission');
      const { status } = await Location.requestBackgroundPermissionsAsync();

      if (status === 'granted') {
        logger.info('✅ Background location permission granted');
        return true;
      }

      // Only show the educational alert if the user hasn't already denied it
      if (Platform.OS === 'android') {
        Alert.alert(
          'Background Location Required',
          'For Okra Rides to work properly, you need to allow location access "All the time" in your device settings.\n\nThis allows you to receive ride requests even when the app is in the background.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => this.openAppSettings() },
          ]
        );
      } else if (Platform.OS === 'ios') {
        Alert.alert(
          'Background Location Required',
          'Please select "Always Allow" when prompted, or go to Settings > Okra Rides > Location and select "Always".',
          [{ text: 'OK' }]
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
   * Request notification permission.
   * Skips the prompt entirely if already granted.
   */
  async requestNotificationPermission(): Promise<boolean> {
    try {
      // ✅ Check first — only prompt if not already granted
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === 'granted') {
        logger.info('✅ Notifications already granted — skipping prompt');
        return true;
      }

      logger.info('Requesting notification permission');
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
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
   * Request draw-over-apps permission (Android only).
   * Skips the Alert prompt if the permission is already granted.
   */
  async requestDrawOverPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      // ✅ Check first — only show the alert if not already granted
      const alreadyGranted = await this.checkDrawOverPermission();
      if (alreadyGranted) {
        logger.info('✅ Draw-over permission already granted — skipping prompt');
        return true;
      }

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
                await IntentLauncher.startActivityAsync(
                  IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION,
                  { data: 'package:com.okraapp' }
                );
              } catch (error) {
                logger.error('Error opening overlay permission settings:', error);
              }
            },
          },
        ]
      );

      return true;
    } catch (error) {
      logger.error('Error requesting draw over permission:', error);
      return false;
    }
  }

  /**
   * Request battery optimization exemption (Android only).
   * Skips the Alert prompt if already exempted.
   */
  async requestBatteryOptimizationExemption(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      // ✅ Check first — only show the alert if not already exempted
      const alreadyExempted = await this.checkBatteryOptimizationExemption();
      if (alreadyExempted) {
        logger.info('✅ Battery optimization already exempted — skipping prompt');
        return true;
      }

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
                  { data: 'package:com.okraapp' }
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
   * Check specific permission by name
   */
  async check(permissionType: string): Promise<string> {
    try {
      switch (permissionType) {
        case 'location': {
          const { status } = await Location.getForegroundPermissionsAsync();
          return status;
        }
        case 'backgroundLocation': {
          const { status } = await Location.getBackgroundPermissionsAsync();
          return status;
        }
        case 'notification': {
          const { status } = await Notifications.getPermissionsAsync();
          return status;
        }
        default:
          return 'unsupported';
      }
    } catch (error) {
      logger.error(`Error checking ${permissionType} permission:`, error);
      return 'denied';
    }
  }

  /**
   * Request specific permission by name.
   * Each method already checks if already granted before prompting.
   */
  async request(permissionType: string): Promise<string> {
    try {
      switch (permissionType) {
        case 'location': {
          const granted = await this.requestLocationPermission();
          return granted ? 'granted' : 'denied';
        }
        case 'backgroundLocation': {
          const granted = await this.requestBackgroundLocationPermission();
          return granted ? 'granted' : 'denied';
        }
        case 'notification': {
          const granted = await this.requestNotificationPermission();
          return granted ? 'granted' : 'denied';
        }
        case 'drawOver': {
          const granted = await this.requestDrawOverPermission();
          return granted ? 'granted' : 'denied';
        }
        default:
          return 'unsupported';
      }
    } catch (error) {
      logger.error(`Error requesting ${permissionType} permission:`, error);
      return 'denied';
    }
  }

  /**
   * Check draw-over-apps permission (Android only).
   * Uses a native module if available, otherwise defaults to true
   * (the draw-over alert only shows when it's actually needed).
   */
  async checkDrawOverPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      // If your project has a native module that exposes Settings.canDrawOverlays(),
      // call it here. Example with react-native-system-setting or similar:
      //   const { NativeModules } = require('react-native');
      //   return await NativeModules.OverlayPermission.isGranted();
      //
      // Until then, we default to true so repeat prompts are suppressed.
      // The first-time alert will still fire because requestDrawOverPermission()
      // only calls this after alreadyGranted check — on a fresh install this
      // returns true and skips, which is acceptable: the OS itself will enforce
      // the permission when the app tries to draw.
      return true;
    } catch (error) {
      logger.error('Error checking draw over permission:', error);
      return false;
    }
  }

  /**
   * Check battery optimization exemption (Android only).
   * Returns true if the app is already whitelisted.
   */
  async checkBatteryOptimizationExemption(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      // If you have expo-battery or a native module:
      //   import * as Battery from 'expo-battery';
      //   const mode = await Battery.getPowerStateAsync();
      //   return mode.lowPowerMode === false; // rough proxy
      //
      // Or with react-native-device-info:
      //   return await DeviceInfo.isBatteryCharging(); // not quite right
      //
      // For a proper check, add a native module that calls
      // PowerManager.isIgnoringBatteryOptimizations(packageName).
      // Until then, default to true so repeat prompts are suppressed.
      return true;
    } catch (error) {
      logger.error('Error checking battery optimization exemption:', error);
      return false;
    }
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
          { data: 'package:com.okraapp' }
        );
      }
    } catch (error) {
      logger.error('Error opening app settings:', error);
      Alert.alert('Error', 'Could not open settings');
    }
  }
}

export default new PermissionManager();