//OkraApp\src\services\DeepLinkService.ts
import { logger } from '../utils/logger';

type WebViewSender = ((data: any) => void) | null;

class DeepLinkService {
  /**
   * Handle notification tap and route to correct page
   */
  handleNotification(data: any, sendToWebView: WebViewSender): void {
    try {
      logger.info('Handling notification deep link:', data);

      if (!sendToWebView) {
        logger.warn('sendToWebView not available');
        return;
      }

      let url = '';
      const baseUrls = {
        driver: process.env.EXPO_PUBLIC_DRIVER_URL || 'https://driver.okra.tech',
        rider: process.env.EXPO_PUBLIC_RIDER_URL || 'https://book.okra.tech',
        conductor: process.env.EXPO_PUBLIC_CONDUCTOR_URL || 'https://conductor.okra.tech',
        delivery: process.env.EXPO_PUBLIC_DELIVERY_URL || 'https://delivery.okra.tech',
      };

      // Route based on notification type
      switch (data.type) {
        case 'ride_request':
          url = `${baseUrls.driver}/rides/${data.rideId}`;
          break;

        case 'ride_started':
          url = `${baseUrls.driver}/active-ride/${data.rideId}`;
          break;

        case 'ride_completed':
          url = `${baseUrls.driver}/history/${data.rideId}`;
          break;

        case 'message':
          url = `${baseUrls.driver}/messages/${data.conversationId}`;
          break;

        case 'payment_received':
          url = `${baseUrls.driver}/earnings`;
          break;

        case 'reconnect':
          // Just refresh current page
          url = 'refresh';
          break;

        default:
          logger.warn('Unknown notification type:', data.type);
          return;
      }

      // Send navigation command to WebView
      sendToWebView({
        type: 'NAVIGATE_TO',
        payload: {
          url,
          data,
        },
      });

      logger.info('Navigation command sent to WebView:', url);
    } catch (error) {
      logger.error('Error handling notification deep link:', error);
    }
  }

  /**
   * Handle draw-over action result
   */
  handleDrawOverAction(action: 'accept' | 'decline', data: any, sendToWebView: WebViewSender): void {
    try {
      logger.info(`Draw-over action: ${action}`, data);

      if (!sendToWebView) {
        logger.warn('sendToWebView not available');
        return;
      }

      sendToWebView({
        type: 'RIDE_REQUEST_ACTION',
        payload: {
          action,
          rideId: data.rideId,
          rideCode: data.rideCode,
        },
      });
    } catch (error) {
      logger.error('Error handling draw-over action:', error);
    }
  }
}

export default new DeepLinkService();