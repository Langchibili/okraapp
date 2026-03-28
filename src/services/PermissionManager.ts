// OkraApp\src\services\PermissionManager.ts
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert, NativeModules } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { logger } from '../utils/logger';
import { showPermissionsVideoPrompt } from '../components/PermissionsVideoModal';

// ─────────────────────────────────────────────────────────────────────────────
// DRAW-OVER CONFIRM HANDLER
// DrawOverConfirmModal registers itself here on mount.
// Returns: true = user confirmed enabled, false = go back to settings
// ─────────────────────────────────────────────────────────────────────────────
let _drawOverConfirmHandler: (() => Promise<boolean>) | null = null;

export function registerDrawOverConfirmHandler(handler: () => Promise<boolean>): void {
  _drawOverConfirmHandler = handler;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY CACHE
// ─────────────────────────────────────────────────────────────────────────────
const _cache: { drawOver: boolean | null; battery: boolean | null } = {
  drawOver: null,
  battery:  null,
};

// ─────────────────────────────────────────────────────────────────────────────
// NATIVE MODULE HELPERS  (best-effort)
// ─────────────────────────────────────────────────────────────────────────────
const tryNativeDrawOverCheck = async (): Promise<boolean | null> => {
  try {
    const mod =
      NativeModules.OverlayPermission     ||
      NativeModules.DrawOverlayPermission ||
      null;
    if (mod?.isGranted)       return await mod.isGranted();
    if (mod?.canDrawOverlays) return await mod.canDrawOverlays();
    return null;
  } catch { return null; }
};

const tryNativeBatteryCheck = async (): Promise<boolean | null> => {
  try {
    const mod =
      NativeModules.BatteryOptimization ||
      NativeModules.PowerManager        ||
      null;
    if (mod?.isIgnoringBatteryOptimizations)
      return await mod.isIgnoringBatteryOptimizations();
    return null;
  } catch { return null; }
};

// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionStatus {
  location:            boolean;
  backgroundLocation:  boolean;
  notification:        boolean;
  drawOver:            boolean;
  batteryOptimization: boolean;
}

class PermissionManager {

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC: Request all critical permissions
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Requests every permission the app needs.
   * After all prompts complete, shows the "Watch setup video?" modal.
   */
  async requestCriticalPermissions(frontendName: string): Promise<PermissionStatus> {
    logger.info(`Requesting critical permissions for ${frontendName}`);

    const permissions: PermissionStatus = {
      location:            false,
      backgroundLocation:  false,
      notification:        false,
      drawOver:            false,
      batteryOptimization: false,
    };

    permissions.location = await this.requestLocationPermission();

    if (frontendName !== 'rider') {
      permissions.backgroundLocation = await this.requestBackgroundLocationPermission();
    } else {
      permissions.backgroundLocation = true;
    }

    permissions.notification = await this.requestNotificationPermission();

    if (Platform.OS === 'android' && frontendName !== 'rider') {
      permissions.drawOver = await this.requestDrawOverPermission();
    } else {
      permissions.drawOver = true;
    }

    if (Platform.OS === 'android' && frontendName !== 'rider') {
      permissions.batteryOptimization = await this.requestBatteryOptimizationExemption();
    } else {
      permissions.batteryOptimization = true;
    }

    logger.info('Permission request results:', permissions);

    // After ALL permission prompts complete, show the "Watch setup video?" modal.
    // Small delay so the last permission dialog has fully dismissed.
    setTimeout(() => {
      showPermissionsVideoPrompt();
    }, 600);

    return permissions;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RE-CHECK ON APP RESUME
  // ───────────────────────────────────────────────────────────────────────────

  async recheckOnResume(): Promise<{ drawOver: boolean; batteryOptimization: boolean }> {
    if (Platform.OS !== 'android') return { drawOver: true, batteryOptimization: true };
    _cache.drawOver = null;
    _cache.battery  = null;
    const drawOver            = await this._resolveDrawOverState();
    const batteryOptimization = await this._resolveBatteryState();
    logger.info(`[recheckOnResume] drawOver=${drawOver}, battery=${batteryOptimization}`);
    return { drawOver, batteryOptimization };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FOREGROUND LOCATION
  // ───────────────────────────────────────────────────────────────────────────

  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing === 'granted') { logger.info('✅ Foreground location already granted'); return true; }

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') { logger.info('✅ Foreground location granted'); return true; }

      if (!canAskAgain) {
        await this._loopUntilGranted(
          'Location Required',
          'Okra Rides cannot work without location access.\n\nTap "Open Settings" and enable Location for Okra Rides.',
          async () => (await Location.getForegroundPermissionsAsync()).status === 'granted',
        );
        return (await Location.getForegroundPermissionsAsync()).status === 'granted';
      }

      logger.warn('Foreground location denied');
      return false;
    } catch (error) { logger.error('Error requesting foreground location:', error); return false; }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BACKGROUND LOCATION
  // ───────────────────────────────────────────────────────────────────────────

  async requestBackgroundLocationPermission(): Promise<boolean> {
    try {
      const { status: existing } = await Location.getBackgroundPermissionsAsync();
      if (existing === 'granted') { logger.info('✅ Background location already granted'); return true; }

      const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
      if (fgStatus !== 'granted') { logger.warn('Foreground must be granted before background'); return false; }

      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === 'granted') { logger.info('✅ Background location granted'); return true; }

      const message = Platform.OS === 'android'
        ? 'Okra Rides needs "Allow all the time" location access.\n\nTap "Open Settings" → Location → "Allow all the time".'
        : 'Okra Rides needs "Always" location access.\n\nTap "Open Settings" → Location → "Always".';

      await this._loopUntilGranted(
        'Background Location Required',
        message,
        async () => (await Location.getBackgroundPermissionsAsync()).status === 'granted',
      );

      return (await Location.getBackgroundPermissionsAsync()).status === 'granted';
    } catch (error) { logger.error('Error requesting background location:', error); return false; }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ───────────────────────────────────────────────────────────────────────────

  async requestNotificationPermission(): Promise<boolean> {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === 'granted') { logger.info('✅ Notifications already granted'); return true; }

      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') { logger.info('✅ Notifications granted'); return true; }

      if (!canAskAgain) {
        await this._loopUntilGranted(
          'Notifications Required',
          'Okra Rides needs notifications for ride and delivery alerts.\n\nTap "Open Settings" and enable Notifications for Okra Rides.',
          async () => (await Notifications.getPermissionsAsync()).status === 'granted',
        );
        return (await Notifications.getPermissionsAsync()).status === 'granted';
      }

      logger.warn('Notification permission denied');
      return false;
    } catch (error) { logger.error('Error requesting notification permission:', error); return false; }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DRAW OVER OTHER APPS  (Android only)
  // ───────────────────────────────────────────────────────────────────────────

  async requestDrawOverPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      if (await this._resolveDrawOverState()) {
        logger.info('✅ Draw-over already granted — skipping prompt');
        return true;
      }

      logger.info('Requesting draw-over permission (loops until granted)');

      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (await this._resolveDrawOverState()) break;

        await new Promise<void>((resolve) => {
          Alert.alert(
            'Display Over Other Apps Required',
            'Okra Rides must show ride requests over other apps (e.g. navigation) so you never miss one.\n\nTap "Open Settings" and enable "Display over other apps" for Okra Rides.',
            [{
              text: 'Open Settings',
              onPress: async () => {
                await this._openOverlaySettings();
                resolve();
              },
            }],
            { cancelable: false },
          );
        });

        await new Promise((r) => setTimeout(r, 400));

        if (await this._resolveDrawOverState()) break;

        const confirmed = await this._showDrawOverConfirm();
        if (confirmed) {
          _cache.drawOver = true;
          break;
        }
      }

      return this._resolveDrawOverState();
    } catch (error) {
      logger.error('Error requesting draw-over permission:', error);
      return false;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BATTERY OPTIMIZATION EXEMPTION  (Android only)
  // ───────────────────────────────────────────────────────────────────────────

  async requestBatteryOptimizationExemption(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      if (await this._resolveBatteryState()) {
        logger.info('✅ Battery optimization already exempted — skipping prompt');
        return true;
      }

      logger.info('Requesting battery optimization exemption (loops until granted)');

      await this._loopUntilGranted(
        'Battery Optimization Must Be Disabled',
        "Android's battery optimization stops Okra Rides from receiving ride requests in the background.\n\nTap \"Open Settings\", find Okra Rides, and select \"Don't optimize\" or \"Unrestricted\".",
        () => this._resolveBatteryState(),
        () => this._openBatterySettings(),
      );

      return this._resolveBatteryState();
    } catch (error) {
      logger.error('Error requesting battery optimization exemption:', error);
      return false;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC: check / request by name
  // ───────────────────────────────────────────────────────────────────────────

  async check(permissionType: string): Promise<string> {
    try {
      switch (permissionType) {
        case 'location':           return (await Location.getForegroundPermissionsAsync()).status;
        case 'backgroundLocation': return (await Location.getBackgroundPermissionsAsync()).status;
        case 'notification':       return (await Notifications.getPermissionsAsync()).status;
        case 'drawOver':           return (await this._resolveDrawOverState()) ? 'granted' : 'denied';
        case 'batteryOptimization':return (await this._resolveBatteryState())  ? 'granted' : 'denied';
        default: return 'unsupported';
      }
    } catch (error) { logger.error(`Error checking ${permissionType}:`, error); return 'denied'; }
  }

  async request(permissionType: string): Promise<string> {
    try {
      switch (permissionType) {
        case 'location':           return (await this.requestLocationPermission())           ? 'granted' : 'denied';
        case 'backgroundLocation': return (await this.requestBackgroundLocationPermission()) ? 'granted' : 'denied';
        case 'notification':       return (await this.requestNotificationPermission())       ? 'granted' : 'denied';
        case 'drawOver':           return (await this.requestDrawOverPermission())           ? 'granted' : 'denied';
        case 'batteryOptimization':return (await this.requestBatteryOptimizationExemption()) ? 'granted' : 'denied';
        default: return 'unsupported';
      }
    } catch (error) { logger.error(`Error requesting ${permissionType}:`, error); return 'denied'; }
  }

  async checkDrawOverPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return this._resolveDrawOverState();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CORE LOOP
  // ───────────────────────────────────────────────────────────────────────────

  private async _loopUntilGranted(
    title: string,
    message: string,
    isGranted: () => Promise<boolean>,
    openSettings?: () => Promise<void>,
  ): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (await isGranted()) return;

      await new Promise<void>((resolve) => {
        Alert.alert(
          title,
          message,
          [{
            text: 'Open Settings',
            onPress: async () => {
              if (openSettings) await openSettings();
              else await this.openAppSettings();
              resolve();
            },
          }],
          { cancelable: false },
        );
      });

      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DRAW-OVER CONFIRM MODAL
  // ───────────────────────────────────────────────────────────────────────────

  private async _showDrawOverConfirm(): Promise<boolean> {
    if (_drawOverConfirmHandler) {
      try { return await _drawOverConfirmHandler(); } catch { /* fall through */ }
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Did You Enable It?',
        'You must ensure "Display over other apps" is set for Okra Rides.\n\nOkra needs this to show you ride requests when you are not in the app.',
        [
          { text: 'Go Back to Settings', style: 'cancel', onPress: () => resolve(false) },
          { text: "Yes, I've Enabled It",                 onPress: () => resolve(true)  },
        ],
        { cancelable: false },
      );
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SETTINGS OPENERS
  // ───────────────────────────────────────────────────────────────────────────

  private async _openOverlaySettings(): Promise<void> {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION,
        { data: 'package:com.okraapp' },
      );
    } catch (error) {
      logger.error('Error opening overlay settings, falling back:', error);
      await this.openAppSettings();
    }
  }

  private async _openBatterySettings(): Promise<void> {
    const directUrl =
      'intent:#Intent;' +
      'action=android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS;' +
      'data=package:com.okraapp;' +
      'end';

    try {
      const canOpen = await Linking.canOpenURL(directUrl);
      if (canOpen) {
        await Linking.openURL(directUrl);
        _cache.battery = true;
        return;
      }
    } catch (e) { logger.warn('Direct battery intent URL failed:', e); }

    const listUrl =
      'intent:#Intent;' +
      'action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;' +
      'end';

    try {
      const canOpen = await Linking.canOpenURL(listUrl);
      if (canOpen) {
        await Linking.openURL(listUrl);
        _cache.battery = true;
        return;
      }
    } catch (e) { logger.warn('Battery list intent URL failed:', e); }

    await this.openAppSettings();
    _cache.battery = true;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE RESOLVERS
  // ───────────────────────────────────────────────────────────────────────────

  private async _resolveDrawOverState(): Promise<boolean> {
    if (_cache.drawOver === true) return true;
    const nativeResult = await tryNativeDrawOverCheck();
    if (nativeResult !== null) {
      if (nativeResult) _cache.drawOver = true;
      return nativeResult;
    }
    return false;
  }

  private async _resolveBatteryState(): Promise<boolean> {
    if (_cache.battery === true) return true;
    const nativeResult = await tryNativeBatteryCheck();
    if (nativeResult !== null) {
      if (nativeResult) _cache.battery = true;
      return nativeResult;
    }
    return false;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // OPEN APP SETTINGS
  // ───────────────────────────────────────────────────────────────────────────

  async openAppSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
          { data: 'package:com.okraapp' },
        );
      }
    } catch (error) {
      logger.error('Error opening app settings:', error);
      Alert.alert('Error', 'Could not open settings. Please open them manually.');
    }
  }
}

export default new PermissionManager();