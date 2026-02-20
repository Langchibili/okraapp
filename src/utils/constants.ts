// OkraApp/src/utils/constants.ts
// Native-side constants - synchronized with rider frontend

export const SOCKET_EVENTS = {
  // Connection Events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  
  // Rider Events
  RIDER: {
    JOIN: 'rider:join',
    CONNECTED: 'rider:connected',
    SESSION_REPLACED: 'rider:session-replaced',
    LOCATION_UPDATE: 'rider:location:update',
    LOCATION_UPDATED: 'rider:location:updated',
  },
  
  // Driver Events
  DRIVER: {
    JOIN: 'driver:join',
    CONNECTED: 'driver:connected',
    SESSION_REPLACED: 'driver:session-replaced',
    LOCATION_UPDATE: 'driver:location:update',
    LOCATION_UPDATED: 'driver:location:updated',
    ONLINE: 'driver:online',
    OFFLINE: 'driver:offline',
    ONLINE_SUCCESS: 'driver:online:success',
    OFFLINE_SUCCESS: 'driver:offline:success',
    FORCED_OFFLINE: 'driver:forced:offline',
    ARRIVED: 'ride:driver:arrived',
  },
  
  // Ride Lifecycle Events
  RIDE: {
    REQUEST_NEW: 'ride:request:new',
    REQUEST_CREATED: 'ride:request:created',
    REQUEST_SENT: 'ride:request:sent',
    REQUEST_RECEIVED: 'ride:request:received',
    ACCEPT: 'ride:accept',
    ACCEPTED: 'ride:accepted',
    ACCEPT_SUCCESS: 'ride:accept:success',
    DECLINE: 'ride:decline',
    DECLINED: 'ride:declined',
    DECLINE_SUCCESS: 'ride:decline:success',
    CANCELLED: 'ride:cancelled',
    TAKEN: 'ride:taken',
    TRIP_STARTED: 'ride:trip:started',
    TRIP_COMPLETED: 'ride:trip:completed',
    NO_DRIVERS: 'ride:no_drivers',
  },
  
  // Subscription Events
  SUBSCRIPTION: {
    EXPIRING_WARNING: 'subscription:expiring:warning',
    EXPIRED: 'subscription:expired',
    ACTIVATED: 'subscription:activated',
  },
  
  // Payment Events
  PAYMENT: {
    SUCCESS: 'payment:success',
    FAILED: 'payment:failed',
  },
  
  // Withdrawal Events
  WITHDRAWAL: {
    PROCESSED: 'withdrawal:processed',
  },
  
  // Rating Events
  RATING: {
    REQUEST: 'rating:request',
    SUBMITTED: 'rating:submitted',
  },
  
  // Notification Events
  NOTIFICATION: {
    NEW: 'notification:new',
    BROADCAST: 'notification:broadcast',
  },
  
  // SOS Events
  SOS: {
    TRIGGER: 'sos:trigger',
    TRIGGERED: 'sos:triggered',
    ALERT: 'sos:alert',
    ACKNOWLEDGED: 'sos:acknowledged',
  },
  
  // Affiliate Events
  AFFILIATE: {
    REFERRAL_SIGNUP: 'affiliate:referral:signup',
    COMMISSION_EARNED: 'affiliate:commission:earned',
  },
  
  // System Events
  SYSTEM: {
    ANNOUNCEMENT: 'system:announcement',
  },
  
  // Connection Events
  CONNECTION: {
    PING: 'ping',
    PONG: 'pong',
    ERROR: 'error',
    GET_CURRENT_LOCATION:"GET_CURRENT_LOCATION"
  },
};

// WebView Message Types (messages sent from Native to WebView)
export const WEBVIEW_EVENTS = {
  // Ride Events
  RIDE_REQUEST_CREATED: 'RIDE_REQUEST_CREATED',
  RIDE_REQUEST_NEW: 'RIDE_REQUEST_NEW',
  RIDE_REQUEST_RECEIVED: 'RIDE_REQUEST_RECEIVED',
  RIDE_ACCEPTED: 'RIDE_ACCEPTED',
  RIDE_TAKEN: 'RIDE_TAKEN',
  RIDE_CANCELLED: 'RIDE_CANCELLED',
  RIDE_ACCEPT_SUCCESS: 'RIDE_ACCEPT_SUCCESS',
  RIDE_DECLINE_SUCCESS: 'RIDE_DECLINE_SUCCESS',
  
  // Trip Events
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  TRIP_STARTED: 'TRIP_STARTED',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  
  // Location Events
  DRIVER_LOCATION_UPDATED: 'DRIVER_LOCATION_UPDATED',
  RIDER_LOCATION_UPDATED: 'RIDER_LOCATION_UPDATED',
  LOCATION_UPDATE: 'LOCATION_UPDATE',
  
  // Driver Availability
  DRIVER_ONLINE_SUCCESS: 'DRIVER_ONLINE_SUCCESS',
  DRIVER_OFFLINE_SUCCESS: 'DRIVER_OFFLINE_SUCCESS',
  DRIVER_FORCED_OFFLINE: 'DRIVER_FORCED_OFFLINE',
  
  // Subscription Events
  SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_ACTIVATED: 'SUBSCRIPTION_ACTIVATED',
  
  // Payment Events
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  WITHDRAWAL_PROCESSED: 'WITHDRAWAL_PROCESSED',
  
  // Rating Events
  RATING_REQUEST: 'RATING_REQUEST',
  RATING_SUBMITTED: 'RATING_SUBMITTED',
  
  // Notification Events
  NOTIFICATION_NEW: 'NOTIFICATION_NEW',
  NOTIFICATION_BROADCAST: 'NOTIFICATION_BROADCAST',
  NOTIFICATION_RECEIVED: 'NOTIFICATION_RECEIVED',
  
  // SOS Events
  SOS_TRIGGERED: 'SOS_TRIGGERED',
  SOS_ACKNOWLEDGED: 'SOS_ACKNOWLEDGED',
  
  // Affiliate Events
  AFFILIATE_REFERRAL_SIGNUP: 'AFFILIATE_REFERRAL_SIGNUP',
  AFFILIATE_COMMISSION_EARNED: 'AFFILIATE_COMMISSION_EARNED',
  
  // System Events
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  SESSION_REPLACED: 'SESSION_REPLACED',
  
  // Socket Connection Events
  SOCKET_CONNECTED: 'SOCKET_CONNECTED',
  SOCKET_DISCONNECTED: 'SOCKET_DISCONNECTED',
  SOCKET_ERROR: 'SOCKET_ERROR',
  
  // App Events
  APP_RESUMED: 'APP_RESUMED',
  
  // Device Info
  DEVICE_INFO: 'DEVICE_INFO',
  PERMISSION_RESULT: 'PERMISSION_RESULT',
};

// Native Message Types (messages sent from WebView to Native)
export const NATIVE_EVENTS = {
  INITIALIZE_SERVICES: 'INITIALIZE_SERVICES',
  REQUEST_PERMISSION: 'REQUEST_PERMISSION',
  CHECK_PERMISSION: 'CHECK_PERMISSION',
  GET_CURRENT_LOCATION: 'GET_CURRENT_LOCATION',
  START_LOCATION_TRACKING: 'START_LOCATION_TRACKING',
  STOP_LOCATION_TRACKING: 'STOP_LOCATION_TRACKING',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
  PLAY_AUDIO: 'PLAY_AUDIO',
  GO_ONLINE: 'GO_ONLINE',
  GO_OFFLINE: 'GO_OFFLINE',
  LOG_DATA: 'LOG_DATA',
};

export const CONSTANTS = {
  APP_NAME: 'OkraRides',
  APP_VERSION: '1.0.0',
  
  // Socket URLs (will be overridden by env vars)
  DEVICE_SOCKET_URL: process.env.EXPO_PUBLIC_DEVICE_SOCKET_URL || 'http://10.134.31.23:3008',
  MAIN_SOCKET_URL: process.env.EXPO_PUBLIC_MAIN_SOCKET_URL || 'http://10.134.31.23:3005',
  BACKEND_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:1343/api',

  
  // Frontend URLs
  FRONTEND_URLS: {
    landing: process.env.EXPO_PUBLIC_LANDING_URL || 'http://192.168.56.1:3000',
    driver: process.env.EXPO_PUBLIC_DRIVER_URL || 'https://driver.okra.tech',
    rider: process.env.EXPO_PUBLIC_RIDER_URL || 'https://book.okra.tech',
    conductor: process.env.EXPO_PUBLIC_CONDUCTOR_URL || 'https://conductor.okra.tech',
    delivery: process.env.EXPO_PUBLIC_DELIVERY_URL || 'https://delivery.okra.tech',
    admin: process.env.EXPO_PUBLIC_ADMIN_URL || 'http://localhost:3005'
  },

  // Location Settings
  LOCATION: {
    BACKGROUND_UPDATE_INTERVAL: 5000, // 5 seconds
    BACKGROUND_DISTANCE_INTERVAL: 10, // 10 meters
    FOREGROUND_UPDATE_INTERVAL: 3000, // 3 seconds
    ACCURACY: 'high' as const,
  },

  // Notification Settings
  NOTIFICATION: {
    RIDE_REQUEST_TIMEOUT: 30000, // 30 seconds
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
  },

  // Audio Settings
  AUDIO: {
    RIDE_REQUEST_SOUND: 'ride_request',
    NOTIFICATION_SOUND : 'notification'
  },

  // Task Names
  TASKS: {
    LOCATION_UPDATE: 'background-location-task',
    NOTIFICATION_HANDLER: 'background-notification-task',
  }
};

export default {
  SOCKET_EVENTS,
  WEBVIEW_EVENTS,
  NATIVE_EVENTS,
  CONSTANTS,
};