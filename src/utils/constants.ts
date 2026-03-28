
//const environment = "local"
const environment = "production" as string

export const EXPO_PUBLIC_PROJECT_ID = "9dbb3dbf-f0c1-44fb-86df-e4681a1771cf"
export const SOCKET_EVENTS = {
  // Connection Events
  CONNECT:      'connect',
  DISCONNECT:   'disconnect',
  CONNECTED:    'connected',
  DISCONNECTED: 'disconnected',

  // Rider Events
  RIDER: {
    JOIN:             'rider:join',
    CONNECTED:        'rider:connected',
    SESSION_REPLACED: 'rider:session-replaced',
    LOCATION_UPDATE:  'rider:location:update',
    LOCATION_UPDATED: 'rider:location:updated',
  },

  // Driver Events
  DRIVER: {
    JOIN:             'driver:join',
    CONNECTED:        'driver:connected',
    SESSION_REPLACED: 'driver:session-replaced',
    LOCATION_UPDATE:  'driver:location:update',
    LOCATION_UPDATED: 'driver:location:updated',
    ONLINE:           'driver:online',
    OFFLINE:          'driver:offline',
    ONLINE_SUCCESS:   'driver:online:success',
    OFFLINE_SUCCESS:  'driver:offline:success',
    FORCED_OFFLINE:   'driver:forced:offline',
    ARRIVED:          'ride:driver:arrived',
  },

  // Conductor Events
  CONDUCTOR: {
    SESSION_REPLACED: 'conductor:session-replaced',
  },

  // Delivery Driver Events
  DELIVERY: {
    // Connection / session
    JOIN:              'delivery:join',
    CONNECTED:         'delivery:connected',
    SESSION_REPLACED:  'delivery:session-replaced',

    // Location
    LOCATION_UPDATE:   'delivery:driver:location:update',
    LOCATION_UPDATED:  'delivery:driver:location:updated',

    // Online / offline
    ONLINE_SUCCESS:    'delivery:driver:online:success',
    OFFLINE_SUCCESS:   'delivery:driver:offline:success',
    FORCED_OFFLINE:    'delivery:driver:forced:offline',

    // Delivery request lifecycle
    REQUEST_SENT:      'delivery:request:sent',
    REQUEST_RECEIVED:  'delivery:request:received',
    ACCEPTED:          'delivery:accepted',
    TAKEN:             'delivery:taken',
    DRIVER_ARRIVED:    'delivery:driver:arrived',
    STARTED:           'delivery:started',
    COMPLETED:         'delivery:completed',
    CANCELLED:         'delivery:cancelled',
    NO_DRIVERS:        'delivery:no_drivers',

    // Payment
    PAYMENT_REQUESTED: 'delivery:payment:requested',
    PAYMENT_RECEIVED:  'delivery:payment:received',

    // Status
    STATUS_CHANGED:    'delivery-driver:status:changed',
  },

  // Ride Lifecycle Events
  RIDE: {
    REQUEST_NEW:       'ride:request:new',
    REQUEST_CREATED:   'ride:request:created',
    REQUEST_SENT:      'ride:request:sent',
    REQUEST_RECEIVED:  'ride:request:received',
    ACCEPT:            'ride:accept',
    ACCEPTED:          'ride:accepted',
    ACCEPT_SUCCESS:    'ride:accept:success',
    DECLINE:           'ride:decline',
    DECLINED:          'ride:declined',
    DECLINE_SUCCESS:   'ride:decline:success',
    CANCELLED:         'ride:cancelled',
    TAKEN:             'ride:taken',
    TRIP_STARTED:      'ride:trip:started',
    TRIP_COMPLETED:    'ride:trip:completed',
    NO_DRIVERS:        'ride:no_drivers',
    PAYMENT_REQUESTED: 'ride:payment:requested',
  },

  // Subscription Events
  SUBSCRIPTION: {
    EXPIRING_WARNING: 'subscription:expiring:warning',
    EXPIRED:          'subscription:expired',
    ACTIVATED:        'subscription:activated',
  },

  // Payment Events
  PAYMENT: {
    SUCCESS:          'payment:success',
    FAILED:           'payment:failed',
    PAYMENT_RECEIVED: 'payment:received',
  },

  // Withdrawal Events
  WITHDRAWAL: {
    PROCESSED: 'withdrawal:processed',
  },

  // Rating Events
  RATING: {
    REQUEST:   'rating:request',
    SUBMITTED: 'rating:submitted',
  },

  // Notification Events
  NOTIFICATION: {
    NEW:       'notification:new',
    BROADCAST: 'notification:broadcast',
  },

  // SOS Events
  SOS: {
    TRIGGER:      'sos:trigger',
    TRIGGERED:    'sos:triggered',
    ALERT:        'sos:alert',
    ACKNOWLEDGED: 'sos:acknowledged',
  },

  // Affiliate Events
  AFFILIATE: {
    REFERRAL_SIGNUP:   'affiliate:referral:signup',
    COMMISSION_EARNED: 'affiliate:commission:earned',
  },

  // System Events
  SYSTEM: {
    ANNOUNCEMENT: 'system:announcement',
  },

  // Bus Events
  BUS: {
    ROUTE_STARTED:    'bus:route:started',
    LOCATION_UPDATED: 'bus:location:updated',
  },

  // Device Registration Events
  DEVICE: {
    REGISTER:         'device:register',
    REGISTER_SUCCESS: 'device:register:success',
    REGISTER_ERROR:   'device:register:error',
  },

  // Native / WebView bridge Events (camelCase — bridge events, not socket strings)
  BRIDGE: {
    GET_CURRENT_LOCATION: 'getCurrentLocation',
    SHOW_NOTIFICATION:    'showNotification',
    SHOW_DRAW_OVER:       'showDrawOver',
  },

  // Connection Utilities
  CONNECTION: {
    PING:                 'ping',
    PONG:                 'pong',
    ERROR:                'error',
    CONNECT_ERROR:        'connect_error',
    GET_CURRENT_LOCATION: 'GET_CURRENT_LOCATION',
  },
};

// ─── WebView Message Types ─────────────────────────────────────────────────
// Messages sent FROM the native app TO the WebView (downstream)
export const WEBVIEW_EVENTS = {
  // ── Ride events ──────────────────────────────────────────────────────────
  RIDE_REQUEST_CREATED:    'RIDE_REQUEST_CREATED',
  RIDE_REQUEST_NEW:        'RIDE_REQUEST_NEW',
  RIDE_REQUEST_RECEIVED:   'RIDE_REQUEST_RECEIVED',
  RIDE_ACCEPTED:           'RIDE_ACCEPTED',
  RIDE_TAKEN:              'RIDE_TAKEN',
  RIDE_CANCELLED:          'RIDE_CANCELLED',
  RIDE_ACCEPT_SUCCESS:     'RIDE_ACCEPT_SUCCESS',
  RIDE_DECLINE_SUCCESS:    'RIDE_DECLINE_SUCCESS',
  PAYMENT_REQUESTED:       'PAYMENT_REQUESTED',
  DRIVER_ARRIVED:          'DRIVER_ARRIVED',
  TRIP_STARTED:            'TRIP_STARTED',
  TRIP_COMPLETED:          'TRIP_COMPLETED',

  // ── Delivery events ───────────────────────────────────────────────────────
  DELIVERY_REQUEST_SENT:     'DELIVERY_REQUEST_SENT',
  DELIVERY_REQUEST_RECEIVED: 'DELIVERY_REQUEST_RECEIVED',
  DELIVERY_ACCEPTED:         'DELIVERY_ACCEPTED',
  DELIVERY_TAKEN:            'DELIVERY_TAKEN',           // another driver got it
  DELIVERY_DRIVER_ARRIVED:   'DELIVERY_DRIVER_ARRIVED',
  DELIVERY_STARTED:          'DELIVERY_STARTED',         // package picked up
  DELIVERY_COMPLETED:        'DELIVERY_COMPLETED',
  DELIVERY_CANCELLED:        'DELIVERY_CANCELLED',
  DELIVERY_NO_DRIVERS:       'DELIVERY_NO_DRIVERS',
  DELIVERY_PAYMENT_REQUESTED:'DELIVERY_PAYMENT_REQUESTED',
  DELIVERY_PAYMENT_RECEIVED: 'DELIVERY_PAYMENT_RECEIVED',
  DELIVERY_DRIVER_ONLINE_SUCCESS:  'DELIVERY_DRIVER_ONLINE_SUCCESS',
  DELIVERY_DRIVER_OFFLINE_SUCCESS: 'DELIVERY_DRIVER_OFFLINE_SUCCESS',
  DELIVERY_DRIVER_FORCED_OFFLINE:  'DELIVERY_DRIVER_FORCED_OFFLINE',

  // ── Location ──────────────────────────────────────────────────────────────
  DRIVER_LOCATION_UPDATED:   'DRIVER_LOCATION_UPDATED',
  RIDER_LOCATION_UPDATED:    'RIDER_LOCATION_UPDATED',
  DELIVERY_LOCATION_UPDATED: 'DELIVERY_LOCATION_UPDATED',
  LOCATION_UPDATE:           'LOCATION_UPDATE',

  // ── Driver availability ───────────────────────────────────────────────────
  DRIVER_ONLINE_SUCCESS:  'DRIVER_ONLINE_SUCCESS',
  DRIVER_OFFLINE_SUCCESS: 'DRIVER_OFFLINE_SUCCESS',
  DRIVER_FORCED_OFFLINE:  'DRIVER_FORCED_OFFLINE',

  // ── Subscription ──────────────────────────────────────────────────────────
  SUBSCRIPTION_EXPIRING:  'SUBSCRIPTION_EXPIRING',
  SUBSCRIPTION_EXPIRED:   'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_ACTIVATED: 'SUBSCRIPTION_ACTIVATED',

  // ── Payment ───────────────────────────────────────────────────────────────
  PAYMENT_RECEIVED:     'PAYMENT_RECEIVED',
  PAYMENT_SUCCESS:      'PAYMENT_SUCCESS',
  PAYMENT_FAILED:       'PAYMENT_FAILED',
  WITHDRAWAL_PROCESSED: 'WITHDRAWAL_PROCESSED',

  // ── Rating ────────────────────────────────────────────────────────────────
  RATING_REQUEST:   'RATING_REQUEST',
  RATING_SUBMITTED: 'RATING_SUBMITTED',

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFICATION_NEW:       'NOTIFICATION_NEW',
  NOTIFICATION_BROADCAST: 'NOTIFICATION_BROADCAST',
  NOTIFICATION_RECEIVED:  'NOTIFICATION_RECEIVED',

  // ── SOS ───────────────────────────────────────────────────────────────────
  SOS_TRIGGERED:    'SOS_TRIGGERED',
  SOS_ACKNOWLEDGED: 'SOS_ACKNOWLEDGED',

  // ── Affiliate ─────────────────────────────────────────────────────────────
  AFFILIATE_REFERRAL_SIGNUP:   'AFFILIATE_REFERRAL_SIGNUP',
  AFFILIATE_COMMISSION_EARNED: 'AFFILIATE_COMMISSION_EARNED',

  // ── System / session ──────────────────────────────────────────────────────
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  SESSION_REPLACED:    'SESSION_REPLACED',

  // ── Socket state ──────────────────────────────────────────────────────────
  SOCKET_CONNECTED:    'SOCKET_CONNECTED',
  SOCKET_DISCONNECTED: 'SOCKET_DISCONNECTED',
  SOCKET_ERROR:        'SOCKET_ERROR',

  // ── App lifecycle ─────────────────────────────────────────────────────────
  APP_RESUMED:       'APP_RESUMED',
  DEVICE_INFO:       'DEVICE_INFO',
  PERMISSION_RESULT: 'PERMISSION_RESULT',
};

// ─── Native Message Types ──────────────────────────────────────────────────
// Messages sent FROM the WebView TO the native app (upstream)
export const NATIVE_EVENTS = {
  INITIALIZE_SERVICES:    'INITIALIZE_SERVICES',
  REQUEST_PERMISSION:     'REQUEST_PERMISSION',
  CHECK_PERMISSION:       'CHECK_PERMISSION',
  GET_CURRENT_LOCATION:   'GET_CURRENT_LOCATION',
  START_LOCATION_TRACKING:'START_LOCATION_TRACKING',
  STOP_LOCATION_TRACKING: 'STOP_LOCATION_TRACKING',
  SHOW_NOTIFICATION:      'SHOW_NOTIFICATION',
  PLAY_AUDIO:             'PLAY_AUDIO',
  GO_ONLINE:              'GO_ONLINE',
  GO_OFFLINE:             'GO_OFFLINE',
  LOG_DATA:               'LOG_DATA',
};


//  environment  is either "local" or "production"
export const CONSTANTS = {
  APP_NAME:    'OkraApp',
  APP_VERSION: '1.0.0',
  DEVICE_SOCKET_URL:  environment === "local"? "http://172.31.156.23:3008" : "https://devicesocket.okratest.online",
  MAIN_SOCKET_URL:    environment === "local"? "http://172.31.156.23:3005" : "https://socket.okratest.online",
  BACKEND_URL:      environment === "local"? "http://172.31.156.23:1343/api" : "https://backend.okratest.online/api",

  FRONTEND_URLS: {
    landing:   environment === "local"? "http://172.31.156.23:3000" : "https://okratest.online",
    rider:     environment === "local"? "http://172.31.156.23:3001" : "https://rider.okratest.online",
    driver:    environment === "local"? "http://172.31.156.23:3002" : "https://driver.okratest.online",
    delivery:  environment === "local"? "http://172.31.156.23:3003" : "https://delivery.okratest.online",
    admin:     environment === "local"? "http://172.31.156.23:3007" : "https://admin.okratest.online",
    conductor: environment === "local"? "http://172.31.156.23:3004" : "https://socket.okratest.online",
  },

  LOCATION: {
    BACKGROUND_UPDATE_INTERVAL:   5000,
    BACKGROUND_DISTANCE_INTERVAL: 10,
    FOREGROUND_UPDATE_INTERVAL:   3000,
    ACCURACY: 'high' as const,
  },

  NOTIFICATION: {
    RIDE_REQUEST_TIMEOUT: 30000,
    HEARTBEAT_INTERVAL:   30000,
  },

  AUDIO: {
    RIDE_REQUEST_SOUND: 'ride_request',
    NOTIFICATION_SOUND: 'notification',
  },

  TASKS: {
    LOCATION_UPDATE:      'background-location-task',
    NOTIFICATION_HANDLER: 'background-notification-task',
  },
};

export default {
  SOCKET_EVENTS,
  WEBVIEW_EVENTS,
  NATIVE_EVENTS,
  CONSTANTS,
};