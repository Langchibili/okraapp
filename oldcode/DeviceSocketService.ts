// //OkraApp\src\services\DeviceSocketService.ts
// import io, { Socket } from 'socket.io-client';
// import { logger } from '../utils/logger';
// import NetInfo from '@react-native-community/netinfo';

// interface DeviceRegistration {
//   deviceId: string;
//   userId: string | number;
//   userType: 'driver' | 'rider' | 'conductor' | 'delivery';
//   frontendName: string;
//   notificationToken: string | null;
//   deviceInfo: any;
//   socketServerUrl: string;
// }

// type EventHandler = (data: any) => void;

// class DeviceSocketService {
//   private socket: Socket | null = null;
//   private serverUrl: string = '';
//   private isConnectedState: boolean = false;
//   private reconnectAttempts: number = 0;
//   private maxReconnectAttempts: number = 10;
//   private reconnectDelay: number = 1000;
//   private eventHandlers: Map<string, Set<EventHandler>> = new Map();
//   private deviceRegistration: DeviceRegistration | null = null;
//   private heartbeatInterval: NodeJS.Timeout | null = null;

//   /**
//    * Connect to device socket server
//    */
//   async connect(serverUrl: string): Promise<boolean> {
//     try {
//       logger.info(`Connecting to device socket: ${serverUrl}`);

//       this.serverUrl = serverUrl;

//       // Check network connectivity first
//       const netInfo = await NetInfo.fetch();
//       if (!netInfo.isConnected) {
//         logger.warn('No network connection available');
//         return false;
//       }

//       // Close existing connection if any
//       if (this.socket) {
//         this.socket.close();
//       }

//       // Create new socket connection
//       this.socket = io(serverUrl, {
//         transports: ['websocket', 'polling'],
//         reconnection: true,
//         reconnectionDelay: this.reconnectDelay,
//         reconnectionAttempts: this.maxReconnectAttempts,
//         timeout: 10000,
//       });

//       // Setup event listeners
//       this.setupSocketListeners();

//       return new Promise((resolve) => {
//         const timeout = setTimeout(() => {
//           logger.error('Socket connection timeout');
//           resolve(false);
//         }, 15000);

//         this.socket?.once('connect', () => {
//           clearTimeout(timeout);
//           logger.info('✅ Device socket connected');
//           this.isConnectedState = true;
//           this.reconnectAttempts = 0;
//           this.startHeartbeat();
//           resolve(true);
//         });

//         this.socket?.once('connect_error', (error) => {
//           clearTimeout(timeout);
//           logger.error('Socket connection error:', error);
//           resolve(false);
//         });
//       });
//     } catch (error) {
//       logger.error('Error connecting to device socket:', error);
//       return false;
//     }
//   }

//   /**
//    * Setup socket event listeners
//    */
//   private setupSocketListeners() {
//     if (!this.socket) return;

//     this.socket.on('connect', () => {
//       logger.info('Socket connected');
//       this.isConnectedState = true;
//       this.reconnectAttempts = 0;
//       this.triggerEvent('connected', {});

//       // Re-register device after reconnection
//       if (this.deviceRegistration) {
//         this.registerDevice(this.deviceRegistration);
//       }
//     });

//     this.socket.on('disconnect', (reason) => {
//       logger.warn('Socket disconnected:', reason);
//       this.isConnectedState = false;
//       this.stopHeartbeat();
//       this.triggerEvent('disconnected', { reason });
//     });

//     this.socket.on('connect_error', (error) => {
//       logger.error('Socket connect error:', error);
//       this.reconnectAttempts++;
      
//       if (this.reconnectAttempts >= this.maxReconnectAttempts) {
//         logger.error('Max reconnect attempts reached');
//         this.triggerEvent('max_reconnect_reached', {});
//       }
//     });

//     this.socket.on('error', (error) => {
//       logger.error('Socket error:', error);
//     });

//     // Pong response
//     this.socket.on('pong', (data) => {
//       logger.debug('Received pong:', data);
//     });

//     // Device registration response
//     this.socket.on('device:register:success', (data) => {
//       logger.info('Device registered successfully:', data);
//       this.triggerEvent('device_registered', data);
//     });

//     this.socket.on('device:register:error', (error) => {
//       logger.error('Device registration error:', error);
//       this.triggerEvent('device_registration_error', error);
//     });

//     // Location request from backend
//     this.socket.on('getCurrentLocation', (data) => {
//       logger.info('Received location request from backend');
//       this.triggerEvent('getCurrentLocation', data);
//     });

//     // Notification request
//     this.socket.on('showNotification', (data) => {
//       logger.info('Received notification request');
//       this.triggerEvent('showNotification', data);
//     });

//     // Draw-over request
//     this.socket.on('showDrawOver', (data) => {
//       logger.info('Received draw-over request');
//       this.triggerEvent('showDrawOver', data);
//     });
//   }

//   /**
//    * Register device with backend
//    */
//   async registerDevice(registration: DeviceRegistration): Promise<void> {
//     try {
//       logger.info('Registering device with backend');

//       this.deviceRegistration = registration;

//       if (!this.socket || !this.isConnectedState) {
//         logger.warn('Socket not connected, cannot register device');
//         return;
//       }

//       this.socket.emit('device:register', registration);
//     } catch (error) {
//       logger.error('Error registering device:', error);
//     }
//   }

//   /**
//    * Emit event to server
//    */
//   async emit(event: string, data: any): Promise<void> {
//     try {
//       if (!this.socket || !this.isConnectedState) {
//         logger.warn(`Socket not connected, cannot emit ${event}`);
//         return;
//       }

//       this.socket.emit(event, data);
//       logger.debug(`Emitted ${event}:`, data);
//     } catch (error) {
//       logger.error(`Error emitting ${event}:`, error);
//     }
//   }

//   /**
//    * Listen for events from server
//    */
//   on(event: string, handler: EventHandler): () => void {
//     if (!this.eventHandlers.has(event)) {
//       this.eventHandlers.set(event, new Set());
//     }

//     this.eventHandlers.get(event)!.add(handler);

//     // Return unsubscribe function
//     return () => {
//       const handlers = this.eventHandlers.get(event);
//       if (handlers) {
//         handlers.delete(handler);
//       }
//     }
//   }

//   /**
//    * Trigger event handlers
//    */
//   private triggerEvent(event: string, data: any) {
//     const handlers = this.eventHandlers.get(event);
//     if (handlers) {
//       handlers.forEach(handler => {
//         try {
//           handler(data);
//         } catch (error) {
//           logger.error(`Error in event handler for ${event}:`, error);
//         }
//       });
//     }
//   }

//   /**
//    * Start heartbeat (ping every 30s)
//    */
//   private startHeartbeat() {
//     this.stopHeartbeat();

//     this.heartbeatInterval = setInterval(() => {
//       if (this.socket && this.isConnectedState) {
//         this.socket.emit('ping', { timestamp: Date.now() });
//       }
//     }, 30000);

//     logger.info('Heartbeat started');
//   }

//   /**
//    * Stop heartbeat
//    */
//   private stopHeartbeat() {
//     if (this.heartbeatInterval) {
//       clearInterval(this.heartbeatInterval);
//       this.heartbeatInterval = null;
//     }
//   }

//   /**
//    * Reconnect to server
//    */
//   async reconnect(): Promise<boolean> {
//     logger.info('Attempting to reconnect...');
    
//     if (this.socket) {
//       this.socket.close();
//     }

//     return this.connect(this.serverUrl);
//   }

//   /**
//    * Disconnect from server
//    */
//   disconnect() {
//     logger.info('Disconnecting from device socket');
    
//     this.stopHeartbeat();
    
//     if (this.socket) {
//       this.socket.close();
//       this.socket = null;
//     }

//     this.isConnectedState = false;
//   }

//   /**
//    * Check if connected
//    */
//   isConnected(): boolean {
//     return this.isConnectedState && this.socket !== null && this.socket.connected;
//   }
// }

// export default new DeviceSocketService();