//OkraApp/src/services/DeviceSocketService.ts (Complete)
import io, { Socket } from 'socket.io-client';
import { logger } from '../utils/logger';
import NetInfo from '@react-native-community/netinfo';

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

  /**
   * Connect to device socket server
   */
  async connect(serverUrl: string): Promise<boolean> {
    try {
      logger.info(`Connecting to device socket: ${serverUrl}`);

      this.serverUrl = serverUrl;

      // Check network connectivity first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        logger.warn('No network connection available');
        return false;
      }

      // Close existing connection if any
      if (this.socket) {
        this.socket.close();
      }

      // Create new socket connection
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
      });

      // Setup event listeners
      this.setupSocketListeners();

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          logger.error('Socket connection timeout');
          resolve(false);
        }, 15000);

        this.socket?.once('connect', () => {
          clearTimeout(timeout);
          logger.info('✅ Device socket connected');
          this.isConnectedState = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve(true);
        });

        this.socket?.once('connect_error', (error) => {
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

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('Socket connected');
      this.isConnectedState = true;
      this.reconnectAttempts = 0;
      this.triggerEvent('connected', {});

      // Re-register device after reconnection
      if (this.deviceRegistration) {
        this.registerDevice(this.deviceRegistration);
      }
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn('Socket disconnected:', reason);
      this.isConnectedState = false;
      this.stopHeartbeat();
      this.triggerEvent('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      logger.error('Socket connect error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('Max reconnect attempts reached');
        this.triggerEvent('max_reconnect_reached', {});
      }
    });

    this.socket.on('error', (error) => {
      logger.error('Socket error:', error);
      console.log('socketlog- error:', JSON.stringify(error, null, 2));
      this.triggerEvent('socket_error', error);
    });

    // Pong response
    this.socket.on('pong', (data) => {
      logger.debug('Received pong:', data);
    });

    // Device registration response
    this.socket.on('device:register:success', (data) => {
      logger.info('Device registered successfully:', data);
      this.triggerEvent('device_registered', data);
    });

    this.socket.on('device:register:error', (error) => {
      logger.error('Device registration error:', error);
      this.triggerEvent('device_registration_error', error);
    });

    // ==================== SETUP ALL EVENT LISTENERS WITH LOGGING ====================
    
    // Location request from backend
    this.socket.on('getCurrentLocation', (data) => {
      console.log('socketlog- getCurrentLocation:', JSON.stringify(data, null, 2));
      this.triggerEvent('getCurrentLocation', data);
    });

    // Notification request
    this.socket.on('showNotification', (data) => {
      console.log('socketlog- showNotification:', JSON.stringify(data, null, 2));
      this.triggerEvent('showNotification', data);
    });

    // Draw-over request
    this.socket.on('showDrawOver', (data) => {
      console.log('socketlog- showDrawOver:', JSON.stringify(data, null, 2));
      this.triggerEvent('showDrawOver', data);
    });

    // ==================== RIDE EVENTS ====================
    
    this.socket.on('ride:request:created', (data) => {
      console.log('socketlog- ride:request:created:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:request:created', data);
    });

    this.socket.on('ride:request:new', (data) => {
      console.log('socketlog- ride:request:new:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:request:new', data);
    });

    this.socket.on('ride:request:received', (data) => {
      console.log('socketlog- ride:request:received:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:request:received', data);
    });

    this.socket.on('ride:accepted', (data) => {
      console.log('socketlog- ride:accepted:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:accepted', data);
    });

    this.socket.on('ride:taken', (data) => {
      console.log('socketlog- ride:taken:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:taken', data);
    });

    this.socket.on('ride:driver:arrived', (data) => {
      console.log('socketlog- ride:driver:arrived:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:driver:arrived', data);
    });

    this.socket.on('ride:trip:started', (data) => {
      console.log('socketlog- ride:trip:started:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:trip:started', data);
    });

    this.socket.on('ride:trip:completed', (data) => {
      console.log('socketlog- ride:trip:completed:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:trip:completed', data);
    });

    this.socket.on('ride:cancelled', (data) => {
      console.log('socketlog- ride:cancelled:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:cancelled', data);
    });

    this.socket.on('ride:accept:success', (data) => {
      console.log('socketlog- ride:accept:success:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:accept:success', data);
    });

    this.socket.on('ride:decline:success', (data) => {
      console.log('socketlog- ride:decline:success:', JSON.stringify(data, null, 2));
      this.triggerEvent('ride:decline:success', data);
    });

    // ==================== LOCATION EVENTS ====================
    
    this.socket.on('driver:location:updated', (data) => {
      console.log('socketlog- driver:location:updated:', JSON.stringify(data, null, 2));
      this.triggerEvent('driver:location:updated', data);
    });

    this.socket.on('rider:location:updated', (data) => {
      console.log('socketlog- rider:location:updated:', JSON.stringify(data, null, 2));
      this.triggerEvent('rider:location:updated', data);
    });

    // ==================== DRIVER AVAILABILITY EVENTS ====================
    
    this.socket.on('driver:online:success', (data) => {
      console.log('socketlog- driver:online:success:', JSON.stringify(data, null, 2));
      this.triggerEvent('driver:online:success', data);
    });

    this.socket.on('driver:offline:success', (data) => {
      console.log('socketlog- driver:offline:success:', JSON.stringify(data, null, 2));
      this.triggerEvent('driver:offline:success', data);
    });

    this.socket.on('driver:forced:offline', (data) => {
      console.log('socketlog- driver:forced:offline:', JSON.stringify(data, null, 2));
      this.triggerEvent('driver:forced:offline', data);
    });

    // ==================== SUBSCRIPTION EVENTS ====================
    
    this.socket.on('subscription:expiring:warning', (data) => {
      console.log('socketlog- subscription:expiring:warning:', JSON.stringify(data, null, 2));
      this.triggerEvent('subscription:expiring:warning', data);
    });

    this.socket.on('subscription:expired', (data) => {
      console.log('socketlog- subscription:expired:', JSON.stringify(data, null, 2));
      this.triggerEvent('subscription:expired', data);
    });

    this.socket.on('subscription:activated', (data) => {
      console.log('socketlog- subscription:activated:', JSON.stringify(data, null, 2));
      this.triggerEvent('subscription:activated', data);
    });

    // ==================== PAYMENT EVENTS ====================
    
    this.socket.on('payment:success', (data) => {
      console.log('socketlog- payment:success:', JSON.stringify(data, null, 2));
      this.triggerEvent('payment:success', data);
    });

    this.socket.on('payment:failed', (data) => {
      console.log('socketlog- payment:failed:', JSON.stringify(data, null, 2));
      this.triggerEvent('payment:failed', data);
    });

    this.socket.on('withdrawal:processed', (data) => {
      console.log('socketlog- withdrawal:processed:', JSON.stringify(data, null, 2));
      this.triggerEvent('withdrawal:processed', data);
    });

    // ==================== RATING EVENTS ====================
    
    this.socket.on('rating:request', (data) => {
      console.log('socketlog- rating:request:', JSON.stringify(data, null, 2));
      this.triggerEvent('rating:request', data);
    });

    this.socket.on('rating:submitted', (data) => {
      console.log('socketlog- rating:submitted:', JSON.stringify(data, null, 2));
      this.triggerEvent('rating:submitted', data);
    });

    // ==================== NOTIFICATION EVENTS ====================
    
    this.socket.on('notification:new', (data) => {
      console.log('socketlog- notification:new:', JSON.stringify(data, null, 2));
      this.triggerEvent('notification:new', data);
    });

    this.socket.on('notification:broadcast', (data) => {
      console.log('socketlog- notification:broadcast:', JSON.stringify(data, null, 2));
      this.triggerEvent('notification:broadcast', data);
    });

    // ==================== SOS & EMERGENCY EVENTS ====================
    
    this.socket.on('sos:triggered', (data) => {
      console.log('socketlog- sos:triggered:', JSON.stringify(data, null, 2));
      this.triggerEvent('sos:triggered', data);
    });

    this.socket.on('sos:acknowledged', (data) => {
      console.log('socketlog- sos:acknowledged:', JSON.stringify(data, null, 2));
      this.triggerEvent('sos:acknowledged', data);
    });

    // ==================== BUS ROUTE EVENTS ====================
    
    this.socket.on('bus:route:started', (data) => {
      console.log('socketlog- bus:route:started:', JSON.stringify(data, null, 2));
      this.triggerEvent('bus:route:started', data);
    });

    this.socket.on('bus:location:updated', (data) => {
      console.log('socketlog- bus:location:updated:', JSON.stringify(data, null, 2));
      this.triggerEvent('bus:location:updated', data);
    });

    // ==================== AFFILIATE EVENTS ====================
    
    this.socket.on('affiliate:referral:signup', (data) => {
      console.log('socketlog- affiliate:referral:signup:', JSON.stringify(data, null, 2));
      this.triggerEvent('affiliate:referral:signup', data);
    });

    this.socket.on('affiliate:commission:earned', (data) => {
      console.log('socketlog- affiliate:commission:earned:', JSON.stringify(data, null, 2));
      this.triggerEvent('affiliate:commission:earned', data);
    });

    // ==================== SYSTEM EVENTS ====================
    
    this.socket.on('system:announcement', (data) => {
      console.log('socketlog- system:announcement:', JSON.stringify(data, null, 2));
      this.triggerEvent('system:announcement', data);
    });

    // ==================== SESSION EVENTS ====================
    
    this.socket.on('rider:session-replaced', (data) => {
      console.log('socketlog- rider:session-replaced:', JSON.stringify(data, null, 2));
      this.triggerEvent('rider:session-replaced', data);
    });

    this.socket.on('driver:session-replaced', (data) => {
      console.log('socketlog- driver:session-replaced:', JSON.stringify(data, null, 2));
      this.triggerEvent('driver:session-replaced', data);
    });

    this.socket.on('conductor:session-replaced', (data) => {
      console.log('socketlog- conductor:session-replaced:', JSON.stringify(data, null, 2));
      this.triggerEvent('conductor:session-replaced', data);
    });

    this.socket.on('delivery:session-replaced', (data) => {
      console.log('socketlog- delivery:session-replaced:', JSON.stringify(data, null, 2));
      this.triggerEvent('delivery:session-replaced', data);
    });

    logger.info('✅ All socket event listeners setup complete');
  }

  /**
   * Register device with backend
   */
  async registerDevice(registration: DeviceRegistration): Promise<void> {
    try {
      logger.info('Registering device with backend');

      this.deviceRegistration = registration;

      if (!this.socket || !this.isConnectedState) {
        logger.warn('Socket not connected, cannot register device');
        return;
      }

      this.socket.emit('device:register', registration);
    } catch (error) {
      logger.error('Error registering device:', error);
    }
  }

  /**
   * Emit event to server
   */
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

  /**
   * Listen for events from server
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Trigger event handlers
   */
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

  /**
   * Start heartbeat (ping every 30s)
   */
  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnectedState) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, 30000);

    logger.info('Heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Reconnect to server
   */
  async reconnect(): Promise<boolean> {
    logger.info('Attempting to reconnect...');
    
    if (this.socket) {
      this.socket.close();
    }

    return this.connect(this.serverUrl);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    logger.info('Disconnecting from device socket');
    
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.isConnectedState = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.isConnectedState && this.socket !== null && this.socket.connected;
  }
}

export default new DeviceSocketService();