import { requireNativeModule } from 'expo-modules-core';

const CanDrawOverlaysModule = requireNativeModule('CanDrawOverlays');

/**
 * Returns true if this app has been granted "Display over other apps" permission.
 * Wraps Settings.canDrawOverlays(context) on Android.
 * Always returns true on iOS and on Android < 6.0.
 */
export async function canDrawOverlays(): Promise<boolean> {
  try {
    return await CanDrawOverlaysModule.canDrawOverlays();
  } catch {
    return false;
  }
}
