// export default new DeviceSocketService();
import io, { Socket } from 'socket.io-client';
import { logger } from '../utils/logger';
import NetInfo from '@react-native-community/netinfo';
import { SOCKET_EVENTS } from '../utils/constants';

const S = SOCKET_EVENTS; // local alias for brevity

interface DeviceRegistration {
  deviceId: string;
  userId: string | number;
  userType: 'driver' | 'rider' | 'conductor' | 'delivery';
  frontendName: string;
  notificationToken: string | null;
  deviceInfo: any;
  socketServerUrl: string;
}

type EventHandler = (data: any) => void;

class DeviceSocketService {
  private socket: Socket | null = null;
  private serverUrl: string = '';
  private isConnectedState: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private deviceRegistration: DeviceRegistration | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  async connect(serverUrl: string): Promise<boolean> {
    try {
      logger.info(`Connecting to device socket: ${serverUrl}`);
      this.serverUrl = serverUrl;

      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        logger.warn('No network connection available');
        return false;
      }

      if (this.socket) this.socket.close();

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
      });

      this.setupSocketListeners();

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          logger.error('Socket connection timeout');
          resolve(false);
        }, 15000);

        this.socket?.once(S.CONNECT, () => {
          clearTimeout(timeout);
          logger.info('✅ Device socket connected');
          this.isConnectedState = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve(true);
        });

        this.socket?.once(S.CONNECTION.CONNECT_ERROR, (error) => {
          clearTimeout(timeout);
          logger.error('Socket connection error:', error);
          resolve(false);
        });
      });
    } catch (error) {
      logger.error('Error connecting to device socket:', error);
      return false;
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // ── Connection ────────────────────────────────────────────────────────
    this.socket.on(S.CONNECT, () => {
      logger.info('Socket connected');
      this.isConnectedState = true;
      this.reconnectAttempts = 0;
      this.triggerEvent(S.CONNECTED, {});
      if (this.deviceRegistration) this.registerDevice(this.deviceRegistration);
    });

    this.socket.on(S.DISCONNECT, (reason) => {
      logger.warn('Socket disconnected:', reason);
      this.isConnectedState = false;
      this.stopHeartbeat();
      this.triggerEvent(S.DISCONNECTED, { reason });
    });

    this.socket.on(S.CONNECTION.CONNECT_ERROR, (error) => {
      logger.error('Socket connect error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('Max reconnect attempts reached');
        this.triggerEvent('max_reconnect_reached', {});
      }
    });

    this.socket.on(S.CONNECTION.ERROR, (error) => {
      logger.error('Socket error:', error);
      console.log('socketlog- error:', JSON.stringify(error, null, 2));
      this.triggerEvent('socket_error', error);
    });

    this.socket.on(S.CONNECTION.PONG, (data) => {
      logger.debug('Received pong:', data);
    });

    // ── Device Registration ───────────────────────────────────────────────
    this.socket.on(S.DEVICE.REGISTER_SUCCESS, (data) => {
      logger.info('Device registered successfully:', data);
      this.triggerEvent('device_registered', data);
    });

    this.socket.on(S.DEVICE.REGISTER_ERROR, (error) => {
      logger.error('Device registration error:', error);
      this.triggerEvent('device_registration_error', error);
    });

    // ── Bridge / Native Requests ──────────────────────────────────────────
    this.socket.on(S.BRIDGE.GET_CURRENT_LOCATION, (data) => {
      console.log('socketlog- getCurrentLocation:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.BRIDGE.GET_CURRENT_LOCATION, data);
    });

    this.socket.on(S.BRIDGE.SHOW_NOTIFICATION, (data) => {
      console.log('socketlog- showNotification:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.BRIDGE.SHOW_NOTIFICATION, data);
    });

    this.socket.on(S.BRIDGE.SHOW_DRAW_OVER, (data) => {
      console.log('socketlog- showDrawOver:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.BRIDGE.SHOW_DRAW_OVER, data);
    });

    // ── Ride Events ───────────────────────────────────────────────────────
    this.socket.on(S.RIDE.REQUEST_CREATED, (data) => {
      console.log('socketlog- ride:request:created:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.REQUEST_CREATED, data);
    });

    this.socket.on(S.RIDE.REQUEST_NEW, (data) => {
      console.log('socketlog- ride:request:new:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.REQUEST_NEW, data);
    });

    this.socket.on(S.RIDE.REQUEST_RECEIVED, (data) => {
      console.log('socketlog- ride:request:received:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.REQUEST_RECEIVED, data);
    });

    this.socket.on(S.RIDE.ACCEPTED, (data) => {
      console.log('socketlog- ride:accepted:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.ACCEPTED, data);
    });

    this.socket.on(S.RIDE.TAKEN, (data) => {
      console.log('socketlog- ride:taken:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.TAKEN, data);
    });

    this.socket.on(S.DRIVER.ARRIVED, (data) => {
      console.log('socketlog- ride:driver:arrived:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DRIVER.ARRIVED, data);
    });

    this.socket.on(S.RIDE.TRIP_STARTED, (data) => {
      console.log('socketlog- ride:trip:started:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.TRIP_STARTED, data);
    });

    this.socket.on(S.RIDE.TRIP_COMPLETED, (data) => {
      console.log('socketlog- ride:trip:completed:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.TRIP_COMPLETED, data);
    });

    this.socket.on(S.RIDE.CANCELLED, (data) => {
      console.log('socketlog- ride:cancelled:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.CANCELLED, data);
    });

    this.socket.on(S.RIDE.ACCEPT_SUCCESS, (data) => {
      console.log('socketlog- ride:accept:success:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.ACCEPT_SUCCESS, data);
    });

    this.socket.on(S.RIDE.DECLINE_SUCCESS, (data) => {
      console.log('socketlog- ride:decline:success:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.DECLINE_SUCCESS, data);
    });

    // ── Delivery Events ───────────────────────────────────────────────────
    this.socket.on(S.DELIVERY.REQUEST_SENT, (data) => {
      console.log('socketlog- delivery:request:sent:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.REQUEST_SENT, data);
    });

    this.socket.on(S.DELIVERY.REQUEST_RECEIVED, (data) => {
      console.log('socketlog- delivery:request:received:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.REQUEST_RECEIVED, data);
    });

    this.socket.on(S.DELIVERY.ACCEPTED, (data) => {
      console.log('socketlog- delivery:accepted:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.ACCEPTED, data);
    });

    this.socket.on(S.DELIVERY.TAKEN, (data) => {
      console.log('socketlog- delivery:taken:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.TAKEN, data);
    });

    this.socket.on(S.DELIVERY.DRIVER_ARRIVED, (data) => {
      console.log('socketlog- delivery:driver:arrived:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.DRIVER_ARRIVED, data);
    });

    this.socket.on(S.DELIVERY.STARTED, (data) => {
      console.log('socketlog- delivery:started:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.STARTED, data);
    });

    this.socket.on(S.DELIVERY.COMPLETED, (data) => {
      console.log('socketlog- delivery:completed:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.COMPLETED, data);
    });

    this.socket.on(S.DELIVERY.CANCELLED, (data) => {
      console.log('socketlog- delivery:cancelled:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.CANCELLED, data);
    });

    this.socket.on(S.DELIVERY.NO_DRIVERS, (data) => {
      console.log('socketlog- delivery:no_drivers:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.NO_DRIVERS, data);
    });

    this.socket.on(S.DELIVERY.PAYMENT_REQUESTED, (data) => {
      console.log('socketlog- delivery:payment:requested:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.PAYMENT_REQUESTED, data);
    });

    this.socket.on(S.DELIVERY.PAYMENT_RECEIVED, (data) => {
      console.log('socketlog- delivery:payment:received:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.PAYMENT_RECEIVED, data);
    });

    this.socket.on(S.DELIVERY.ONLINE_SUCCESS, (data) => {
      console.log('socketlog- delivery:driver:online:success:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.ONLINE_SUCCESS, data);
    });

    this.socket.on(S.DELIVERY.OFFLINE_SUCCESS, (data) => {
      console.log('socketlog- delivery:driver:offline:success:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.OFFLINE_SUCCESS, data);
    });

    this.socket.on(S.DELIVERY.FORCED_OFFLINE, (data) => {
      console.log('socketlog- delivery:driver:forced:offline:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.FORCED_OFFLINE, data);
    });

    this.socket.on(S.DELIVERY.LOCATION_UPDATED, (data) => {
      console.log('socketlog- delivery:driver:location:updated:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.LOCATION_UPDATED, data);
    });

    // ── Location Events ───────────────────────────────────────────────────
    this.socket.on(S.DRIVER.LOCATION_UPDATED, (data) => {
      console.log('socketlog- driver:location:updated:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DRIVER.LOCATION_UPDATED, data);
    });

    this.socket.on(S.RIDER.LOCATION_UPDATED, (data) => {
      console.log('socketlog- rider:location:updated:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDER.LOCATION_UPDATED, data);
    });

    // ── Driver Availability ───────────────────────────────────────────────
    this.socket.on(S.DRIVER.ONLINE_SUCCESS, (data) => {
      console.log('socketlog- driver:online:success:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DRIVER.ONLINE_SUCCESS, data);
    });

    this.socket.on(S.DRIVER.OFFLINE_SUCCESS, (data) => {
      console.log('socketlog- driver:offline:success:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DRIVER.OFFLINE_SUCCESS, data);
    });

    this.socket.on(S.DRIVER.FORCED_OFFLINE, (data) => {
      console.log('socketlog- driver:forced:offline:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DRIVER.FORCED_OFFLINE, data);
    });

    // ── Subscription Events ───────────────────────────────────────────────
    this.socket.on(S.SUBSCRIPTION.EXPIRING_WARNING, (data) => {
      console.log('socketlog- subscription:expiring:warning:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.SUBSCRIPTION.EXPIRING_WARNING, data);
    });

    this.socket.on(S.SUBSCRIPTION.EXPIRED, (data) => {
      console.log('socketlog- subscription:expired:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.SUBSCRIPTION.EXPIRED, data);
    });

    this.socket.on(S.SUBSCRIPTION.ACTIVATED, (data) => {
      console.log('socketlog- subscription:activated:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.SUBSCRIPTION.ACTIVATED, data);
    });

    // ── Payment Events ────────────────────────────────────────────────────
    this.socket.on(S.RIDE.PAYMENT_REQUESTED, (data) => {
      console.log('socketlog- ride:payment:requested:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDE.PAYMENT_REQUESTED, data);
    });

    this.socket.on(S.PAYMENT.SUCCESS, (data) => {
      console.log('socketlog- payment:success:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.PAYMENT.SUCCESS, data);
    });

    this.socket.on(S.PAYMENT.FAILED, (data) => {
      console.log('socketlog- payment:failed:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.PAYMENT.FAILED, data);
    });

    this.socket.on(S.WITHDRAWAL.PROCESSED, (data) => {
      console.log('socketlog- withdrawal:processed:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.WITHDRAWAL.PROCESSED, data);
    });

    // ── Rating Events ─────────────────────────────────────────────────────
    this.socket.on(S.RATING.REQUEST, (data) => {
      console.log('socketlog- rating:request:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RATING.REQUEST, data);
    });

    this.socket.on(S.RATING.SUBMITTED, (data) => {
      console.log('socketlog- rating:submitted:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RATING.SUBMITTED, data);
    });

    // ── Notification Events ───────────────────────────────────────────────
    this.socket.on(S.NOTIFICATION.NEW, (data) => {
      console.log('socketlog- notification:new:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.NOTIFICATION.NEW, data);
    });

    this.socket.on(S.NOTIFICATION.BROADCAST, (data) => {
      console.log('socketlog- notification:broadcast:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.NOTIFICATION.BROADCAST, data);
    });

    // ── SOS Events ────────────────────────────────────────────────────────
    this.socket.on(S.SOS.TRIGGERED, (data) => {
      console.log('socketlog- sos:triggered:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.SOS.TRIGGERED, data);
    });

    this.socket.on(S.SOS.ACKNOWLEDGED, (data) => {
      console.log('socketlog- sos:acknowledged:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.SOS.ACKNOWLEDGED, data);
    });

    // ── Bus Events ────────────────────────────────────────────────────────
    this.socket.on(S.BUS.ROUTE_STARTED, (data) => {
      console.log('socketlog- bus:route:started:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.BUS.ROUTE_STARTED, data);
    });

    this.socket.on(S.BUS.LOCATION_UPDATED, (data) => {
      console.log('socketlog- bus:location:updated:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.BUS.LOCATION_UPDATED, data);
    });

    // ── Affiliate Events ──────────────────────────────────────────────────
    this.socket.on(S.AFFILIATE.REFERRAL_SIGNUP, (data) => {
      console.log('socketlog- affiliate:referral:signup:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.AFFILIATE.REFERRAL_SIGNUP, data);
    });

    this.socket.on(S.AFFILIATE.COMMISSION_EARNED, (data) => {
      console.log('socketlog- affiliate:commission:earned:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.AFFILIATE.COMMISSION_EARNED, data);
    });

    // ── System Events ─────────────────────────────────────────────────────
    this.socket.on(S.SYSTEM.ANNOUNCEMENT, (data) => {
      console.log('socketlog- system:announcement:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.SYSTEM.ANNOUNCEMENT, data);
    });

    // ── Session Replaced Events ───────────────────────────────────────────
    this.socket.on(S.RIDER.SESSION_REPLACED, (data) => {
      console.log('socketlog- rider:session-replaced:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.RIDER.SESSION_REPLACED, data);
    });

    this.socket.on(S.DRIVER.SESSION_REPLACED, (data) => {
      console.log('socketlog- driver:session-replaced:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DRIVER.SESSION_REPLACED, data);
    });

    this.socket.on(S.CONDUCTOR.SESSION_REPLACED, (data) => {
      console.log('socketlog- conductor:session-replaced:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.CONDUCTOR.SESSION_REPLACED, data);
    });

    this.socket.on(S.DELIVERY.SESSION_REPLACED, (data) => {
      console.log('socketlog- delivery:session-replaced:', JSON.stringify(data, null, 2));
      this.triggerEvent(S.DELIVERY.SESSION_REPLACED, data);
    });

    logger.info('✅ All socket event listeners setup complete');
  }

  async registerDevice(registration: DeviceRegistration): Promise<void> {
    try {
      logger.info('Registering device with backend');
      this.deviceRegistration = registration;

      if (!this.socket || !this.isConnectedState) {
        logger.warn('Socket not connected, cannot register device');
        return;
      }

      this.socket.emit(S.DEVICE.REGISTER, registration);
    } catch (error) {
      logger.error('Error registering device:', error);
    }
  }

  async emit(event: string, data: any): Promise<void> {
    try {
      if (!this.socket || !this.isConnectedState) {
        logger.warn(`Socket not connected, cannot emit ${event}`);
        return;
      }
      this.socket.emit(event, data);
      logger.debug(`Emitted ${event}:`, data);
    } catch (error) {
      logger.error(`Error emitting ${event}:`, error);
    }
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  private triggerEvent(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnectedState) {
        this.socket.emit(S.CONNECTION.PING, { timestamp: Date.now() });
      }
    }, 30000);
    logger.info('Heartbeat started');
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async reconnect(): Promise<boolean> {
    logger.info('Attempting to reconnect...');
    if (this.socket) this.socket.close();
    return this.connect(this.serverUrl);
  }

  disconnect() {
    logger.info('Disconnecting from device socket');
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnectedState = false;
  }

  isConnected(): boolean {
    return this.isConnectedState && this.socket !== null && this.socket.connected;
  }
}

export default new DeviceSocketService();