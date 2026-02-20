// OkraApp\src\services\FloatingBubbleService.ts
import { NativeModules, Platform } from 'react-native';
import { logger } from '../utils/logger';
// ✅ CORRECT
import DrawOverNativeModule from '../../modules/expo-draw-over';

// const { DrawOverNativeModule } = NativeModules;

class FloatingBubbleService {
  private pendingRequestCount = 0;

  /**
   * Start the floating bubble (when driver goes online)
   */
  async start(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      logger.warn('⚠️ Floating bubble only supported on Android');
      return false;
    }

    try {
      logger.info('🔵 Attempting to start floating bubble...');
      
      // Check if module is available
      if (!DrawOverNativeModule) {
        logger.error('❌ DrawOverNativeModule not available');
        return false;
      }

      // Check permission first
      const hasPermission = await DrawOverNativeModule.checkPermission();
      logger.info(`🔐 Draw over permission: ${hasPermission}`);
      
      if (!hasPermission) {
        logger.warn('⚠️ Draw over permission not granted, requesting...');
        await DrawOverNativeModule.requestPermission();
        
        // Wait a bit for user to grant permission
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const stillHasPermission = await DrawOverNativeModule.checkPermission();
        if (!stillHasPermission) {
          logger.error('❌ User did not grant permission');
          return false;
        }
      }

      await DrawOverNativeModule.startFloatingBubble();
      
      // Check if it's actually showing
      const isShowing = await DrawOverNativeModule.isFloatingBubbleShowing();
      logger.info(`📊 Bubble showing status: ${isShowing}`);
      
      if (isShowing) {
        logger.info('✅ Floating bubble started successfully');
        return true;
      } else {
        logger.error('❌ Bubble not showing after start command');
        return false;
      }
    } catch (error) {
      logger.error('❌ Error starting floating bubble:', error);
      if (error instanceof Error) {
        logger.error('Error details:', error.message);
        logger.error('Error stack:', error.stack);
      }
      return false;
    }
  }

  /**
   * Stop the floating bubble (when driver goes offline)
   */
  async stop(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      logger.info('🛑 Stopping floating bubble...');
      await DrawOverNativeModule.stopFloatingBubble();
      this.pendingRequestCount = 0;
      logger.info('✅ Floating bubble stopped');
      return true;
    } catch (error) {
      logger.error('❌ Error stopping floating bubble:', error);
      return false;
    }
  }

  /**
   * Check if bubble is showing
   */
  async isShowing(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const showing = await DrawOverNativeModule.isFloatingBubbleShowing();
      logger.info(`📊 Bubble showing: ${showing}`);
      return showing;
    } catch (error) {
      logger.error('❌ Error checking bubble status:', error);
      return false;
    }
  }

  /**
   * Update badge count (number of pending ride requests)
   */
  async updateBadge(count: number): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      this.pendingRequestCount = count;
      await DrawOverNativeModule.updateBubbleBadge(count);
      logger.info(`✅ Badge updated: ${count}`);
    } catch (error) {
      logger.error('❌ Error updating badge:', error);
    }
  }

  /**
   * Increment badge count
   */
  async incrementBadge(): Promise<void> {
    await this.updateBadge(this.pendingRequestCount + 1);
  }

  /**
   * Decrement badge count
   */
  async decrementBadge(): Promise<void> {
    const newCount = Math.max(0, this.pendingRequestCount - 1);
    await this.updateBadge(newCount);
  }

  /**
   * Reset badge count
   */
  async resetBadge(): Promise<void> {
    await this.updateBadge(0);
  }

  /**
   * Show ripple effect (for urgent ride requests)
   */
  async showRipple(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await DrawOverNativeModule.showBubbleRipple();
      logger.info('✅ Ripple effect shown');
    } catch (error) {
      logger.error('❌ Error showing ripple:', error);
    }
  }

  /**
   * Get current badge count
   */
  getBadgeCount(): number {
    return this.pendingRequestCount;
  }
}

export default new FloatingBubbleService();