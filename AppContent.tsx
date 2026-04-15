//OkraApp\AppContent.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  StatusBar, Platform, AppState, StyleSheet, View, Text, BackHandler, TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';

import FloatingBubbleService from './src/services/FloatingBubbleService';
import BackgroundService from './src/services/BackgroundService';
import DeviceSocketService from './src/services/DeviceSocketService';
import LocationService from './src/services/LocationService';
import NotificationService from './src/services/NotificationService';
import PermissionManager from './src/services/PermissionManager';
import AudioService from './src/services/AudioService';
import { getDeviceInfo } from './src/utils/device-info';
import { logger } from './src/utils/logger';
import { SOCKET_EVENTS, WEBVIEW_EVENTS, CONSTANTS } from './src/utils/constants';
import type { WebViewMessage } from './src/types/messages';
import { RideRequestModal } from './src/components/RideRequestModal';
import { DeliveryRequestModal } from './src/components/DeliveryRequestModal';
import { LinearGradient } from 'expo-linear-gradient';
import PermissionsVideoModal from './src/components/PermissionsVideoModal'
import { ConnectionLostBanner } from './src/components/ConnectionLostBanner';
import OfflineScreen from '@components/OfflineScreen';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL BRIDGES
//
// Socket handlers execute in a native-bridge callback context detached from
// React 18's scheduler.  Writing to a plain JS object and flushing via
// setInterval (which IS on the React JS thread) guarantees state commits.
// ─────────────────────────────────────────────────────────────────────────────
const _bridge = {
  // Ride
  pendingRideRequest: null as any,
  pendingVisible:     null as boolean | null,
  // Delivery
  pendingDeliveryRequest: null as any,
  pendingDeliveryVisible: null as boolean | null,
  // Shared
  webViewRef: null as React.RefObject<WebView | null> | null,
};
// ─────────────────────────────────────────────────────────────────────────────

TaskManager.defineTask(CONSTANTS.TASKS.NOTIFICATION_HANDLER, async ({ data, error }: any) => {
  if (error) { logger.error('Background notification task error:', error); return; }
  if (data) { await NotificationService.handleBackgroundNotification(data); }
});

const API_URL = CONSTANTS.BACKEND_URL
const FRONTEND_URL = CONSTANTS.FRONTEND_URLS.landing

const getFrontendUrls = async () => {
  try {
    const response = await fetch(`${API_URL}/frontend-url`);
    if (!response.ok) throw new Error('Failed to fetch URLs');
    const res = await response.json();
    return res?.data?.paths || {};
  } catch (error) {
    logger.error('Error fetching frontend URLs:', error);
    return {};
  }
}


export default function AppContent() {
  const webViewRef = useRef<WebView>(null);
  const [appState,            setAppState]            = useState(AppState.currentState);
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [isLoading,           setIsLoading]           = useState(true);
  const [hasError,            setHasError]            = useState(false);
  const [isConnected,         setIsConnected]         = useState(true);
  const [showFloatingBubble, setShowFloatingBubble] = useState(false)
  const [appBackGroundColor,  setAppBackGroundColor]  = useState('#FFFFFF');
  const [is404,               setIs404]               = useState(false);
  const [currentUrl,          setCurrentUrl]          = useState(FRONTEND_URL);

  const deviceIdRef      = useRef<string | null>(null);
  const userIdRef        = useRef<string | number | null>(null);
  const frontendNameRef  = useRef<string | null>(null);
  const isOnlineRef      = useRef<boolean>(false);
 
  // ── Ride request modal state ──
  const [showRideRequestModal, setShowRideRequestModal] = useState(false);
  const [currentRideRequest,   setCurrentRideRequest]   = useState<any>(null);
  const [frontendUrl, setFrontendUrl] = useState(FRONTEND_URL)
  // ── Delivery request modal state ──
  const [showDeliveryRequestModal, setShowDeliveryRequestModal] = useState(false);
  const [currentDeliveryRequest,   setCurrentDeliveryRequest]   = useState<any>(null);
  
  useEffect(()=>{
      const getFrontendUrl = async ()=>{ // even though we have the frotend url set in the constants file, sometimes we could change the frontend url depending on branding or company needs
        const urls = await getFrontendUrls();
        setFrontendUrl(urls['okra-frontend-app'] || FRONTEND_URL)
      }
      getFrontendUrl()
  },[])

  // Keep bridge webViewRef current
  useEffect(() => { _bridge.webViewRef = webViewRef; }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // HARDWARE BACK BUTTON
  // ─────────────────────────────────────────────────────────────────────────
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // 1. If a modal is visible, close it first
      if (showRideRequestModal) {
        setShowRideRequestModal(false);
        return true;
      }
      if (showDeliveryRequestModal) {
        setShowDeliveryRequestModal(false);
        return true;
      }
      // 2. If showing the 404 screen, reset it and reload
      if (is404) {
        setIs404(false)
        // webViewRef.current?.reload();
        webViewRef.current?.injectJavaScript(`window.location = ""`);
        return true;
      }
      // 3. Navigate back in the WebView if possible
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      // 4. Let the system handle it (exit app)
      return false;
    });
    return () => backHandler.remove();
  }, [showRideRequestModal, showDeliveryRequestModal, is404, canGoBack]);
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // BRIDGE FLUSH — 300 ms interval on the React JS thread
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      // Ride flush
      if (_bridge.pendingVisible !== null) {
        const visible = _bridge.pendingVisible;
        const data    = _bridge.pendingRideRequest;
        _bridge.pendingVisible     = null;
        _bridge.pendingRideRequest = null;
        logger.info('[Bridge flush] ride modal rideId:', data?.rideId);
        setCurrentRideRequest(data);
        setShowRideRequestModal(visible);
      }
      // Delivery flush
      if (_bridge.pendingDeliveryVisible !== null) {
        const visible = _bridge.pendingDeliveryVisible;
        const data    = _bridge.pendingDeliveryRequest;
        _bridge.pendingDeliveryVisible     = null;
        _bridge.pendingDeliveryRequest     = null;
        logger.info('[Bridge flush] delivery modal deliveryId:', data?.deliveryId);
        setCurrentDeliveryRequest(data);
        setShowDeliveryRequestModal(visible);
      }
    }, 300);
    return () => clearInterval(id);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────



  const sendToWebView = useCallback((data: any) => {
    if (!webViewRef.current) { logger.warn('Cannot send to WebView: ref is null'); return; }
    webViewRef.current.postMessage(JSON.stringify({ type: data.type, payload: data.payload ?? {} }));
  }, []);

  // ─── Normalize raw delivery data into the shape DeliveryRequestModal expects ───
  const normalizeDeliveryRequest = (raw: any): any => {
    const pickup  = raw.pickupLocation  || raw.pickup  || {};
    const dropoff = raw.dropoffLocation || raw.dropoff || {};
    return {
      deliveryId:    raw.deliveryId    || raw.id,
      rideCode:      raw.rideCode      || `DEL-${raw.deliveryId || raw.id}`,
      senderName:    raw.senderName    || raw.sender?.name,
      sender: {
        name:             raw.senderName    || raw.sender?.name || 'Sender',
        rating:           raw.sender?.rating           || 5.0,
        totalDeliveries:  raw.sender?.totalDeliveries  || 0,
      },
      pickupLocation: {
        address: pickup.address  || raw.pickupAddress  || 'Pickup location',
        lat: pickup.lat  || 0,
        lng: pickup.lng  || 0,
        name: pickup.name,
      },
      dropoffLocation: {
        address: dropoff.address || raw.dropoffAddress || 'Dropoff location',
        lat: dropoff.lat || 0,
        lng: dropoff.lng || 0,
        name: dropoff.name,
      },
      distance:      raw.distance      || 0,
      estimatedFare: raw.estimatedFare || raw.fare || 0,
      packageType:   raw.packageType   || null,
      isFragile:     raw.isFragile     || false,
      weightKg:      raw.weightKg      || null,
      recipientName: raw.recipientName || raw.recipient?.name || null,
    };
  };

  const normalizeRideRequest = (raw: any): any => {
    const pickup  = raw.pickupLocation  || raw.pickup  || {};
    const dropoff = raw.dropoffLocation || raw.dropoff || {};
    return {
      rideId:    raw.rideId    || raw.id,
      rideCode:  raw.rideCode  || `RIDE-${raw.rideId || raw.id}`,
      riderName: raw.riderName || raw.rider?.name,
      rider: {
        name:       raw.riderName || raw.rider?.name || 'Rider',
        rating:     raw.rider?.rating     || 5.0,
        totalRides: raw.rider?.totalRides || 0,
      },
      pickupLocation: {
        address: pickup.address  || raw.pickupAddress  || 'Pickup location',
        lat: pickup.lat  || 0, lng: pickup.lng  || 0, name: pickup.name,
      },
      dropoffLocation: {
        address: dropoff.address || raw.dropoffAddress || 'Dropoff location',
        lat: dropoff.lat || 0, lng: dropoff.lng || 0, name: dropoff.name,
      },
      distance:      raw.distance      || 0,
      estimatedFare: raw.estimatedFare || raw.fare || 0,
    };
  };

  const showBubbleTemporarily = async (data:any,type:String) => {
      if(currentRideRequest || currentDeliveryRequest || showRideRequestModal || showDeliveryRequestModal){
        await FloatingBubbleService.stop()
        return // don't have the draw over overlay the request overlay
      }
      try {
        if(type === "ride"){
          const dataObject = { ...data }
           console.log('request data dataObject',dataObject)
           await FloatingBubbleService.showRideCard(data)
        }
        else{ // type === "delivery"
           console.log('request data delivery',data)
           await FloatingBubbleService.showDeliveryCard(normalizeDeliveryRequest(data));
        }
        //await FloatingBubbleService.start(); // show the bubble

        setTimeout(async () => {
         try {
          await FloatingBubbleService.stop(); // hide after 10s
        } catch (err) {
        console.log('Error stopping bubble:', err);
       }
      }, 10000); // 10,000ms = 10 seconds
     } catch (err) {
      console.log('Error starting bubble:', err);
     }
    }

  // ─── Accept Ride ─────────────────────────────────────────────────────────
  const handleAcceptRide = async (rideId: string) => {
    logger.info('Accepting ride:', rideId);
    if (!currentRideRequest) { logger.error('No current ride request data'); return; }
    setShowRideRequestModal(false);
    try {
      setIsLoading(true);
      const { deviceId } = await getDeviceInfo();
      const response = await fetch(`${API_URL}/devices/acceptride/${deviceId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to accept ride');
      const result = await response.json();
      logger.info('Ride accepted successfully:', result);
      await FloatingBubbleService.decrementBadge();
      await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.ACCEPTED, { rideId });
      const urls = await getFrontendUrls()
      const userType = currentRideRequest.userType;
      let targetUrl  = '';
      if (userType === 'driver')    targetUrl = urls['okra-driver-app']    || 'http://10.196.215.23:3002';
      else if (userType === 'delivery') targetUrl = urls['okra-delivery-app'] || 'http://10.196.215.23:3003';
      else if (userType === 'conductor') targetUrl = urls['okra-conductor-app'] || 'http://10.196.215.23:3004';
      else targetUrl = urls['okra-driver-app'] || 'http://10.196.215.23:3002';
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`window.location.href = "${targetUrl}/active-ride/${rideId}";`);
      }
      setCurrentRideRequest(null);
    } catch (error) {
      logger.error('Error accepting ride:', error);
      setShowRideRequestModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Decline Ride ─────────────────────────────────────────────────────────
  const handleDeclineRide = async (rideId: string) => {
    logger.info('Declining ride:', rideId);
    if (!currentRideRequest) return;
    setShowRideRequestModal(false);
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/rides/${rideId}/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Driver declined' }),
      });
      if (!response.ok) throw new Error('Failed to decline ride');
      await FloatingBubbleService.decrementBadge();
      await DeviceSocketService.emit(SOCKET_EVENTS.RIDE.DECLINE, { rideId, reason: 'Driver declined' });
      setCurrentRideRequest(null);
    } catch (error) {
      logger.error('Error declining ride:', error);
      setCurrentRideRequest(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Accept Delivery ──────────────────────────────────────────────────────
  const handleAcceptDelivery = async (deliveryId: string) => {
    logger.info('Accepting delivery:', deliveryId);
    if (!currentDeliveryRequest) { logger.error('No current delivery request data'); return; }
    setShowDeliveryRequestModal(false);
    try {
      setIsLoading(true);
      const { deviceId } = await getDeviceInfo();
      // Re-use the same device accept endpoint — pass deliveryId instead of rideId
      const response = await fetch(`${API_URL}/devices/acceptdelivery/${deviceId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId }),
      }); // becasue if you accepted the ride straight up, you would be unauthorized, since modal exist outside the frontend which has token
     
      if (!response.ok) throw new Error('Failed to accept delivery');
      await FloatingBubbleService.decrementBadge();
      await DeviceSocketService.emit(SOCKET_EVENTS.DELIVERY.ACCEPTED, { deliveryId });
      const urls = await getFrontendUrls();
      const targetUrl = urls['okra-delivery-app'] || 'http://10.196.215.23:3003';
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`window.location.href = "${targetUrl}/active-delivery/${deliveryId}";`);
      }
      setCurrentDeliveryRequest(null);
    } catch (error) {
      logger.error('Error accepting delivery:', error);
      setShowDeliveryRequestModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Decline Delivery ─────────────────────────────────────────────────────
  const handleDeclineDelivery = async (deliveryId: string) => {
    logger.info('Declining delivery:', deliveryId);
    if (!currentDeliveryRequest) return;
    setShowDeliveryRequestModal(false);
    try {
      setIsLoading(true);
      await fetch(`${API_URL}/deliveries/${deliveryId}/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Driver declined' }),
      });
      await FloatingBubbleService.decrementBadge();
      await DeviceSocketService.emit(SOCKET_EVENTS.DELIVERY.TAKEN, { deliveryId });
      setCurrentDeliveryRequest(null);
    } catch (error) {
      logger.error('Error declining delivery:', error);
      setCurrentDeliveryRequest(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActiveRide = async () => {
    try {
      const { deviceId } = await getDeviceInfo();
      const rideResponse = await fetch(`${API_URL}/devices/activeride/${deviceId}`);
      if (!rideResponse.ok) return;
      const rideRes = await rideResponse.json();
      if (!rideRes.data || !rideRes.success) return;
      const urls = await getFrontendUrls();
      const ride = rideRes.data;
      if (rideRes.userRole === 'rider') {
        if (ride.rideStatus === 'pending') {
          webViewRef.current?.injectJavaScript(`window.location.href = "${urls['okra-rider-app']}/finding-driver?rideId=${ride.id}";`);
        } else if (['accepted','arrived','passenger_onboard'].includes(ride.rideStatus)) {
          webViewRef.current?.injectJavaScript(`window.location.href = "${urls['okra-rider-app']}/tracking?rideId=${ride.id}";`);
        }
      } else if (rideRes.userRole === 'driver') {
        if (['accepted','arrived','passenger_onboard'].includes(ride.rideStatus)) {
          webViewRef.current?.injectJavaScript(`window.location.href = "${urls['okra-driver-app']}/active-ride/${ride.id}";`);
        }
      } else if (rideRes.userRole === 'delivery') {
        if (['accepted','arrived','passenger_onboard'].includes(ride.rideStatus)) {
          webViewRef.current?.injectJavaScript(`window.location.href = "${urls['okra-delivery-app']}/active-delivery/${ride.id}";`);
        }
      } else if (rideRes.userRole === 'conductor') {
        if (['accepted','arrived','passenger_onboard'].includes(ride.rideStatus)) {
          webViewRef.current?.injectJavaScript(`window.location.href = "${urls['okra-conductor-app']}/active-ride/${ride.id}";`);
        }
      }
    } catch (error) { logger.error('Error handling active ride:', error); }
  };

  const fetchPendingRideRequest = async () => {
    try {
      const { deviceId } = await getDeviceInfo();
      const response = await fetch(`${API_URL}/devices/pending-ride/${deviceId}`);
      const result   = await response.json();
      if (result.success && result.data?.length > 0) {
        const pendingRide = result.data[0];
        setCurrentRideRequest({
          rideId: pendingRide.rideId, rideCode: pendingRide.rideCode,
          riderName: pendingRide.rider?.name,
          rider: { name: pendingRide.rider?.name, rating: 5.0, totalRides: 0 },
          pickupLocation: pendingRide.pickupLocation,
          dropoffLocation: pendingRide.dropoffLocation,
          distance: pendingRide.distance, estimatedFare: pendingRide.estimatedFare,
        });
      }
    } catch (error) { logger.error('Error fetching pending ride request:', error); }
  };

  const fetchPendingDeliveryRequest = async () => {
  try {
    const { deviceId } = await getDeviceInfo();
    const response = await fetch(`${API_URL}/devices/pending-delivery/${deviceId}`);
    const result   = await response.json();
    if (result.success && result.data?.length > 0) {
      const pending = result.data[0];
      setCurrentDeliveryRequest(normalizeDeliveryRequest({
        deliveryId:    pending.deliveryId,
        rideCode:      pending.rideCode,
        senderName:    pending.sender?.name,
        sender:        pending.sender,
        pickupLocation:  pending.pickupLocation,
        dropoffLocation: pending.dropoffLocation,
        distance:      pending.distance,
        estimatedFare: pending.estimatedFare,
        packageType:   pending.package?.packageType,
        isFragile:     pending.package?.fragile,
        weightKg:      pending.package?.weight,
        recipientName: pending.package?.recipientName,
      }));
      setShowDeliveryRequestModal(true);
    }
  } catch (error) {
    logger.error('Error fetching pending delivery request:', error);
  }
};

  // ── Notifications init ──
useEffect(() => {
  NotificationService.initialize(sendToWebView);

  // Register action button categories for ride & delivery requests
  const registerCategories = async () => {
    await Notifications.setNotificationCategoryAsync('ride_request', [
      {
        identifier: 'accept',
        buttonTitle: '✅ Accept',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'decline',
        buttonTitle: '❌ Decline',
        options: { opensAppToForeground: false, isDestructive: true },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('delivery_request', [
      {
        identifier: 'accept',
        buttonTitle: '✅ Accept',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'decline',
        buttonTitle: '❌ Decline',
        options: { opensAppToForeground: false, isDestructive: true },
      },
    ]);
  };

  registerCategories();
  return () => { NotificationService.cleanup(); };
}, [sendToWebView]);

  // ── Notification response listener ──
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { actionIdentifier, notification } = response;
      const data = notification.request.content.data;
      if (data.type === 'ride_request') {
        if (actionIdentifier === 'accept') { setCurrentRideRequest(data); handleAcceptRide(String(data.rideId)); }
        else if (actionIdentifier === 'decline') { setCurrentRideRequest(data); handleDeclineRide(String(data.rideId)); }
        else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) { setCurrentRideRequest(data); setShowRideRequestModal(true); }
      }
      if (data.type === 'delivery_request') {
        if (actionIdentifier === 'accept') { setCurrentDeliveryRequest(normalizeDeliveryRequest(data)); handleAcceptDelivery(String(data.deliveryId)); }
        else if (actionIdentifier === 'decline') { setCurrentDeliveryRequest(normalizeDeliveryRequest(data)); handleDeclineDelivery(String(data.deliveryId)); }
        else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) { setCurrentDeliveryRequest(normalizeDeliveryRequest(data)); setShowDeliveryRequestModal(true); }
      }
    });
    return () => subscription.remove();
  }, []);

  // ── Network + active ride check ──
  useEffect(() => {
    handleActiveRide();
    fetchPendingRideRequest();
    fetchPendingDeliveryRequest();
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      if (state.isConnected && servicesInitialized && !DeviceSocketService.isConnected()) {
        DeviceSocketService.reconnect();
      }
    });
    return () => unsubscribe();
  }, [servicesInitialized]);

  // ── App state listener ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        handleActiveRide();
        fetchPendingRideRequest();
        fetchPendingDeliveryRequest();
        if (await FloatingBubbleService.isShowing()) await FloatingBubbleService.stop();
        if (servicesInitialized && !DeviceSocketService.isConnected()) await DeviceSocketService.reconnect();
        sendToWebView({ type: WEBVIEW_EVENTS.APP_RESUMED, payload: {} });
      } else if (nextAppState === 'background') {
        if (servicesInitialized && Platform.OS === 'android' && frontendNameRef.current !== 'rider') {
          await BackgroundService.ensureForegroundService();
        }
      }
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, [appState, servicesInitialized, sendToWebView]);

  
  // ── Socket listeners ──────────────────────────────────────────────────────
  const setupSocketListeners = useCallback((deviceId: string, frontendName: string) => {
    logger.info(`Setting up socket listeners for ${frontendName}`);

    // ── Location request from backend ─────────────────────────────────────
    DeviceSocketService.on(SOCKET_EVENTS.CONNECTION.GET_CURRENT_LOCATION, async () => {
      try {
        const location = await LocationService.getCurrentLocation();
        if (location && _bridge.webViewRef?.current) {
          _bridge.webViewRef.current.postMessage(JSON.stringify({
            type: WEBVIEW_EVENTS.LOCATION_UPDATE,
            payload: {
              lat: location.coords.latitude, lng: location.coords.longitude,
              accuracy: location.coords.accuracy, heading: location.coords.heading, speed: location.coords.speed,
            },
          }));
        }
      } catch (error) { logger.error('Error getting location on request:', error); }
    });

    DeviceSocketService.on('showNotification', async (notification: any) => {
      await NotificationService.show(notification);
      sendToWebView({ type: WEBVIEW_EVENTS.NOTIFICATION_RECEIVED, payload: notification });
    });

    // ── Draw-over (Android, non-rider) ────────────────────────────────────
    if (Platform.OS === 'android' && frontendName !== 'rider') {
      DeviceSocketService.on('showDrawOver', async (overlayData: any) => {
        console.log('socketlog- showDrawOver:', overlayData?.rideId ?? overlayData?.deliveryId);

        // Delivery draw-over — forward as delivery request
        if (overlayData.deliveryId) {
          await AudioService.playAlert('ride_request');
          await FloatingBubbleService.incrementBadge();
          await FloatingBubbleService.showRipple();
          const hasPermission = await PermissionManager.checkDrawOverPermission();
          if (hasPermission) await BackgroundService.showRideRequest(overlayData);
          await NotificationService.showRideRequest({
            rideId: overlayData.deliveryId, rideCode: overlayData.rideCode,
            riderName: overlayData.senderName,
            pickupAddress: overlayData.pickupLocation?.address || 'Pickup',
            dropoffAddress: overlayData.dropoffLocation?.address || 'Dropoff',
            estimatedFare: overlayData.estimatedFare || 0, distance: overlayData.distance || 0,
            pickupLocation: overlayData.pickupLocation, dropoffLocation: overlayData.dropoffLocation,
          });
          sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_REQUEST_RECEIVED, payload: overlayData });
          return;
        }

        // Ride draw-over (original logic)
        if (overlayData.shouldDrawOver === false) {
          await FloatingBubbleService.incrementBadge();
          await FloatingBubbleService.showRipple();
          await NotificationService.showRideRequest({
            rideId: overlayData.rideId, rideCode: overlayData.rideCode, riderName: overlayData.riderName,
            pickupAddress: overlayData.pickupLocation?.address || overlayData.pickupAddress || 'Pickup',
            dropoffAddress: overlayData.dropoffLocation?.address || overlayData.dropoffAddress || 'Dropoff',
            estimatedFare: overlayData.estimatedFare || 0, distance: overlayData.distance || 0,
            pickupLocation: overlayData.pickupLocation, dropoffLocation: overlayData.dropoffLocation,
          });
          sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW, payload: overlayData });
          return;
        }
        await AudioService.playAlert('ride_request');
        await FloatingBubbleService.incrementBadge();
        await FloatingBubbleService.showRipple();
        const hasPermission = await PermissionManager.checkDrawOverPermission();
        if (hasPermission) await BackgroundService.showRideRequest(overlayData);
        await NotificationService.showRideRequest({
          rideId: overlayData.rideId, rideCode: overlayData.rideCode, riderName: overlayData.riderName,
          pickupAddress: overlayData.pickupLocation?.address || overlayData.pickupAddress || 'Pickup',
          dropoffAddress: overlayData.dropoffLocation?.address || overlayData.dropoffAddress || 'Dropoff',
          estimatedFare: overlayData.estimatedFare || 0, distance: overlayData.distance || 0,
          pickupLocation: overlayData.pickupLocation, dropoffLocation: overlayData.dropoffLocation,
        });
        sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW, payload: overlayData });
      });
    }

    // ═════════════════════════════════════════════════════════════════════
    // RIDE EVENTS (unchanged)
    // ═════════════════════════════════════════════════════════════════════

    DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_CREATED, (data: any) => {
      console.log('socketlog- ride:request:created');
      sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_CREATED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_NEW, async (data: any) => {
      console.log('socketlog- ride:request:new — writing to bridge, rideId:', data?.rideId);
      if(frontendNameRef.current === "rider"){
        return 
      }
      await AudioService.playAlert('ride_request');
      await FloatingBubbleService.incrementBadge();
      await FloatingBubbleService.showRipple();
      _bridge.pendingRideRequest = data;
      _bridge.pendingVisible     = true;
      await NotificationService.showRideRequest({
        rideId: data.rideId, rideCode: data.rideCode, riderName: data.riderName,
        pickupAddress: data.pickupLocation?.address || data.pickupAddress || 'Pickup',
        dropoffAddress: data.dropoffLocation?.address || data.dropoffAddress || 'Dropoff',
        estimatedFare: data.estimatedFare || 0, distance: data.distance || 0,
        pickupLocation: data.pickupLocation, dropoffLocation: data.dropoffLocation,
      });
      const hasPermission = await PermissionManager.checkDrawOverPermission();
      if (hasPermission) await BackgroundService.showRideRequest(data);
      sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_NEW, payload: data });
    })

    DeviceSocketService.on(SOCKET_EVENTS.RIDE.REQUEST_RECEIVED, async (data: any) => {
      if(frontendNameRef.current === "rider"){
        return 
      }
      console.log('socketlog- ride:request:received — writing to bridge, rideId:', data?.rideId);
      await AudioService.playAlert('ride_request');
      showBubbleTemporarily(data,'ride')
      await FloatingBubbleService.incrementBadge();
      await FloatingBubbleService.showRipple();
      _bridge.pendingRideRequest = normalizeRideRequest(data);
      _bridge.pendingVisible     = true;
      await NotificationService.showRideRequest({
        rideId: data.rideId, rideCode: data.rideCode, riderName: data.riderName,
        pickupAddress: data.pickupLocation?.address || data.pickupAddress || 'Pickup',
        dropoffAddress: data.dropoffLocation?.address || data.dropoffAddress || 'Dropoff',
        estimatedFare: data.estimatedFare || 0, distance: data.distance || 0,
        pickupLocation: data.pickupLocation, dropoffLocation: data.dropoffLocation,
      });
      const hasPermission = await PermissionManager.checkDrawOverPermission();
      if (hasPermission) await BackgroundService.showRideRequest(data);
      sendToWebView({ type: WEBVIEW_EVENTS.RIDE_REQUEST_RECEIVED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPTED, async (data: any) => {
      const urls = await getFrontendUrls();
      if (webViewRef.current && frontendNameRef.current !== 'rider') {
        webViewRef.current?.injectJavaScript(`window.location.href = "${urls['okra-rider-app']}/"`);
      }
      await NotificationService.showHighPriority({ title: 'Ride Accepted', body: 'Your driver has accepted the ride request', data });
      sendToWebView({ type: WEBVIEW_EVENTS.RIDE_ACCEPTED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.RIDE.TAKEN,   (data: any) => { 
       if(frontendNameRef.current === "rider"){
         return 
       }
       sendToWebView({ type: WEBVIEW_EVENTS.RIDE_TAKEN,      payload: data }); 
    });
    DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_STARTED,  async (data: any) => {
        await NotificationService.show({ title: 'Trip Started', body: 'Your trip has begun. Safe travels!', data }); 
        if(frontendNameRef.current !== "rider"){
          return 
        } 
        sendToWebView({ type: WEBVIEW_EVENTS.TRIP_STARTED, payload: data }); 
    })
    DeviceSocketService.on(SOCKET_EVENTS.RIDE.TRIP_COMPLETED,async (data: any) => { await NotificationService.show({ title: 'Trip Completed', body: `Fare: K${data.finalFare?.toFixed(2) || 0}`, data }); sendToWebView({ type: WEBVIEW_EVENTS.TRIP_COMPLETED, payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.RIDE.CANCELLED,     async (data: any) => { 
      setShowRideRequestModal(false)
      await NotificationService.show({ title: 'Ride Cancelled', body: data.reason || 'The ride has been cancelled', data }); 
      sendToWebView({ type: WEBVIEW_EVENTS.RIDE_CANCELLED, payload: data }); 
    })
    DeviceSocketService.on(SOCKET_EVENTS.RIDE.ACCEPT_SUCCESS, (data: any) => { 
        sendToWebView({ type: WEBVIEW_EVENTS.RIDE_ACCEPT_SUCCESS,  payload: data }) 
    });
    DeviceSocketService.on(SOCKET_EVENTS.RIDE.DECLINE_SUCCESS,(data: any) => { sendToWebView({ type: WEBVIEW_EVENTS.RIDE_DECLINE_SUCCESS, payload: data }); });

    DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ARRIVED, async (data: any) => {
      const urls = await getFrontendUrls();
      if (webViewRef.current && frontendNameRef.current === 'rider') {
        webViewRef.current?.injectJavaScript(`window.location.href = "${urls['okra-rider-app']}/"`);
      }
      if (webViewRef.current && frontendNameRef.current !== 'rider'){
         return
      }
      await AudioService.playAlert('driver_arrived');
      await NotificationService.showHighPriority({ title: 'Driver Arrived', body: 'Your driver is waiting for you', data });
      sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_ARRIVED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.RIDE.PAYMENT_REQUESTED, async (data: any) => {
      await NotificationService.showHighPriority({ title: 'Payment Required', body: `Please pay K${data.finalFare?.toFixed(2) || '0.00'} for your trip`, data });
      sendToWebView({ type: WEBVIEW_EVENTS.PAYMENT_REQUESTED, payload: data });
    });

    // ═════════════════════════════════════════════════════════════════════
    // DELIVERY EVENTS — new block
    // ═════════════════════════════════════════════════════════════════════

    // Delivery request sent to driver — show modal via bridge (same pattern as rides)
    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.REQUEST_SENT, async (data: any) => {
      console.log('socketlog- delivery:request:sent — writing to bridge, deliveryId:', data?.deliveryId);
      if(frontendNameRef.current === "rider"){
        return 
      }
      await AudioService.playAlert('ride_request');
      await FloatingBubbleService.incrementBadge();
      await FloatingBubbleService.showRipple();
      _bridge.pendingDeliveryRequest = normalizeDeliveryRequest(data);
      _bridge.pendingDeliveryVisible = true;
      await NotificationService.showRideRequest({
        rideId:         data.deliveryId, rideCode: data.rideCode,
        riderName:      data.senderName,
        pickupAddress:  data.pickupLocation?.address  || 'Pickup',
        dropoffAddress: data.dropoffLocation?.address || 'Dropoff',
        estimatedFare:  data.estimatedFare || 0, distance: data.distance || 0,
        pickupLocation: data.pickupLocation, dropoffLocation: data.dropoffLocation,
      });
      const hasPermission = await PermissionManager.checkDrawOverPermission();
      if (hasPermission) await BackgroundService.showRideRequest({ ...data, rideId: data.deliveryId });
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_REQUEST_SENT, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.REQUEST_RECEIVED, async (data: any) => {
      console.log('socketlog- delivery:request:received — writing to bridge, deliveryId:', data?.deliveryId);
      if(frontendNameRef.current === "rider"){
        return 
      }
      await AudioService.playAlert('ride_request');
      showBubbleTemporarily(data,'delivery')
      await FloatingBubbleService.incrementBadge();
      await FloatingBubbleService.showRipple();
      _bridge.pendingDeliveryRequest = normalizeDeliveryRequest(data);
      _bridge.pendingDeliveryVisible = true;
      await NotificationService.showRideRequest({
        rideId:         data.deliveryId, rideCode: data.rideCode,
        riderName:      data.senderName,
        pickupAddress:  data.pickupLocation?.address  || 'Pickup',
        dropoffAddress: data.dropoffLocation?.address || 'Dropoff',
        estimatedFare:  data.estimatedFare || 0, distance: data.distance || 0,
        pickupLocation: data.pickupLocation, dropoffLocation: data.dropoffLocation,
      });
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_REQUEST_RECEIVED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.ACCEPTED, async (data: any) => {
       await NotificationService.showHighPriority({ title: 'Delivery Accepted', body: 'Your delivery request has been accepted', data });
       if(frontendNameRef.current !== "rider"){
         return 
       }
       sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_ACCEPTED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.TAKEN, (data: any) => {
      if(frontendNameRef.current === "rider"){
        return 
      }
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_TAKEN, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.DRIVER_ARRIVED, async (data: any) => {
      await AudioService.playAlert('driver_arrived');
      if(frontendNameRef.current !== "rider"){
         return 
      }
      await NotificationService.showHighPriority({ title: 'Deliverer Arrived', body: 'Your deliverer has arrived at the pickup', data });
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_DRIVER_ARRIVED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.STARTED, async (data: any) => {
       await NotificationService.show({ title: 'Package Picked Up', body: 'Your package is on its way!', data });
       if(frontendNameRef.current !== "rider"){
         return 
       }
       sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_STARTED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.COMPLETED, async (data: any) => {
      await NotificationService.show({ title: 'Delivery Completed', body: `Fare: K${data.finalFare?.toFixed(2) || 0}`, data });
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_COMPLETED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.CANCELLED, async (data: any) => {
      setCurrentDeliveryRequest(false)
      await NotificationService.show({ title: 'Delivery Cancelled', body: data.reason || 'The delivery has been cancelled', data });
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_CANCELLED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.NO_DRIVERS, async (data: any) => {
      if(frontendNameRef.current !== "rider"){
         return 
       }
      await NotificationService.show({ title: 'No Deliverers Available', body: 'No deliverers found in your area. Please try again.', data });
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_NO_DRIVERS, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.PAYMENT_REQUESTED, async (data: any) => {
      await NotificationService.showHighPriority({ title: 'Payment Required', body: `Please pay K${data.finalFare?.toFixed(2) || '0.00'} for your delivery`, data });
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_PAYMENT_REQUESTED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.PAYMENT_RECEIVED, async (data: any) => {
      await NotificationService.show({ title: 'Payment Received', body: `K${data.amount ?? data.finalFare ?? ''} received`, data });
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_PAYMENT_RECEIVED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.ONLINE_SUCCESS, (data: any) => {
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_DRIVER_ONLINE_SUCCESS, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.OFFLINE_SUCCESS, (data: any) => {
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_DRIVER_OFFLINE_SUCCESS, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.FORCED_OFFLINE, async (data: any) => {
      await NotificationService.showHighPriority({ title: 'Account Status', body: data.message || 'You have been taken offline', data });
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_DRIVER_FORCED_OFFLINE, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.LOCATION_UPDATED, (data: any) => {
      sendToWebView({ type: WEBVIEW_EVENTS.DELIVERY_LOCATION_UPDATED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.DELIVERY.SESSION_REPLACED, async (data: any) => {
      await NotificationService.show({ title: 'Session Replaced', body: data.message || 'You have logged in on another device', data });
      sendToWebView({ type: WEBVIEW_EVENTS.SESSION_REPLACED, payload: data });
    });

    // ═════════════════════════════════════════════════════════════════════
    // SHARED EVENTS (location, payment, subscription, etc.)
    // ═════════════════════════════════════════════════════════════════════

    DeviceSocketService.on(SOCKET_EVENTS.DRIVER.LOCATION_UPDATED,  (data: any) => { sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_LOCATION_UPDATED,  payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.RIDER.LOCATION_UPDATED,   (data: any) => { sendToWebView({ type: WEBVIEW_EVENTS.RIDER_LOCATION_UPDATED,   payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.DRIVER.ONLINE_SUCCESS,    (data: any) => { sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_ONLINE_SUCCESS,    payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.DRIVER.OFFLINE_SUCCESS,   (data: any) => { sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_OFFLINE_SUCCESS,   payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.DRIVER.FORCED_OFFLINE, async (data: any) => {
      await NotificationService.showHighPriority({ title: 'Account Status', body: data.message || 'You have been taken offline', data });
      sendToWebView({ type: WEBVIEW_EVENTS.DRIVER_FORCED_OFFLINE, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.PAYMENT_RECEIVED, async (data: any) => {
      await NotificationService.show({ title: 'Payment Received', body: `K${data.amount ?? data.finalFare ?? ''} received via ${data.method === 'cash' ? 'Cash' : 'OkraPay'}`, data });
      sendToWebView({ type: WEBVIEW_EVENTS.PAYMENT_RECEIVED, payload: data });
    });
    DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.SUCCESS, async (data: any) => { await NotificationService.show({ title: 'Payment Successful', body: `K${data.amount?.toFixed(2) || 0} - ${data.type}`, data }); sendToWebView({ type: WEBVIEW_EVENTS.PAYMENT_SUCCESS, payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.PAYMENT.FAILED,  async (data: any) => { await NotificationService.show({ title: 'Payment Failed', body: data.reason || 'Your payment could not be processed', data }); sendToWebView({ type: WEBVIEW_EVENTS.PAYMENT_FAILED,  payload: data }); });

    DeviceSocketService.on(SOCKET_EVENTS.WITHDRAWAL.PROCESSED, async (data: any) => {
      await NotificationService.show({ title: 'Withdrawal Processed', body: `K${data.amount?.toFixed(2) || 0} via ${data.method}`, data });
      sendToWebView({ type: WEBVIEW_EVENTS.WITHDRAWAL_PROCESSED, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRING_WARNING, async (data: any) => { await NotificationService.show({ title: 'Subscription Expiring Soon', body: `Your ${data.planName} plan expires in ${data.daysRemaining} days`, data }); sendToWebView({ type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRING, payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.EXPIRED,          async (data: any) => { await NotificationService.showHighPriority({ title: 'Subscription Expired', body: data.message || 'Your subscription has expired', data }); sendToWebView({ type: WEBVIEW_EVENTS.SUBSCRIPTION_EXPIRED, payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.SUBSCRIPTION.ACTIVATED,        async (data: any) => { await NotificationService.show({ title: 'Subscription Activated', body: `Your ${data.planName} plan is now active`, data }); sendToWebView({ type: WEBVIEW_EVENTS.SUBSCRIPTION_ACTIVATED, payload: data }); });

    DeviceSocketService.on(SOCKET_EVENTS.RATING.REQUEST,    async (data: any) => { await NotificationService.show({ title: 'Rate Your Experience', body: `Please rate your recent trip`, data }); sendToWebView({ type: WEBVIEW_EVENTS.RATING_REQUEST,   payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.RATING.SUBMITTED,        (data: any) => { sendToWebView({ type: WEBVIEW_EVENTS.RATING_SUBMITTED,  payload: data }); });

    DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.NEW,       async (data: any) => { await NotificationService.show(data); sendToWebView({ type: WEBVIEW_EVENTS.NOTIFICATION_NEW,       payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.NOTIFICATION.BROADCAST, async (data: any) => { await NotificationService.show({ title: data.title || 'Announcement', body: data.message || data.body, data }); sendToWebView({ type: WEBVIEW_EVENTS.NOTIFICATION_BROADCAST, payload: data }); });

    DeviceSocketService.on(SOCKET_EVENTS.SOS.TRIGGERED,    async (data: any) => { await NotificationService.showHighPriority({ title: 'SOS Alert Sent', body: 'Emergency services have been notified', data }); sendToWebView({ type: WEBVIEW_EVENTS.SOS_TRIGGERED,    payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.SOS.ACKNOWLEDGED, async (data: any) => { await NotificationService.show({ title: 'SOS Acknowledged', body: `Your alert has been acknowledged by ${data.acknowledgedBy}`, data }); sendToWebView({ type: WEBVIEW_EVENTS.SOS_ACKNOWLEDGED, payload: data }); });

    DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.REFERRAL_SIGNUP,   async (data: any) => { await NotificationService.show({ title: 'Referral Signup', body: `${data.referredUser} signed up! +${data.points} points`, data }); sendToWebView({ type: WEBVIEW_EVENTS.AFFILIATE_REFERRAL_SIGNUP,   payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.AFFILIATE.COMMISSION_EARNED, async (data: any) => { await NotificationService.show({ title: 'Commission Earned', body: `K${data.amount?.toFixed(2) || 0} commission earned`, data });                 sendToWebView({ type: WEBVIEW_EVENTS.AFFILIATE_COMMISSION_EARNED, payload: data }); });

    DeviceSocketService.on(SOCKET_EVENTS.SYSTEM.ANNOUNCEMENT, async (data: any) => {
      if (data.priority === 'high' || data.priority === 'urgent') await NotificationService.showHighPriority({ title: 'Important Announcement', body: data.message, data });
      else await NotificationService.show({ title: 'Announcement', body: data.message, data });
      sendToWebView({ type: WEBVIEW_EVENTS.SYSTEM_ANNOUNCEMENT, payload: data });
    });

    DeviceSocketService.on(SOCKET_EVENTS.RIDER.SESSION_REPLACED,  async (data: any) => { await NotificationService.show({ title: 'Session Replaced', body: data.message || 'You have logged in on another device', data }); sendToWebView({ type: WEBVIEW_EVENTS.SESSION_REPLACED, payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.DRIVER.SESSION_REPLACED, async (data: any) => { await NotificationService.show({ title: 'Session Replaced', body: data.message || 'You have logged in on another device', data }); sendToWebView({ type: WEBVIEW_EVENTS.SESSION_REPLACED, payload: data }); });
    DeviceSocketService.on(SOCKET_EVENTS.CONDUCTOR.SESSION_REPLACED, async (data: any) => { await NotificationService.show({ title: 'Session Replaced', body: data.message || 'You have logged in on another device', data }); sendToWebView({ type: WEBVIEW_EVENTS.SESSION_REPLACED, payload: data }); });

    DeviceSocketService.on(SOCKET_EVENTS.CONNECTED,   () => { console.log('socketlog- connected');         sendToWebView({ type: WEBVIEW_EVENTS.SOCKET_CONNECTED,    payload: {} }); });
    DeviceSocketService.on(SOCKET_EVENTS.DISCONNECTED,(data: any) => { console.log('socketlog- disconnected:', data?.reason); sendToWebView({ type: WEBVIEW_EVENTS.SOCKET_DISCONNECTED, payload: data }); });
    DeviceSocketService.on('socket_error', (data: any) => { console.log('socketlog- socket_error:', data); sendToWebView({ type: WEBVIEW_EVENTS.SOCKET_ERROR, payload: data }); });

    logger.info('✅ All socket event listeners registered');
  }, [sendToWebView]);

const handleRetry = useCallback(() => {
  setHasError(false);
  webViewRef.current?.injectJavaScript(`window.location = ""`);
 // webViewRef.current?.reload();
}, []);

  // ── WebView message handler ──────────────────────────────────────────────
  const onMessage = async (event: any) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
      const { type, requestId, payload } = message;
      logger.info(`Received message from WebView: ${type}`);
      let response: any = null;
      switch (type) {
        case 'INITIALIZE_SERVICES':  response = await handleInitializeServices(payload);  break;
        case 'LOG_DATA':             response = await handleLogDataFromWebView(payload);  break;
        case 'REQUEST_PERMISSION':   response = await handleRequestPermission(payload);   break;
        case 'CHECK_PERMISSION':     response = await handleCheckPermission(payload);     break;
        case 'GET_CURRENT_LOCATION': response = await handleGetCurrentLocation();         break;
        case 'START_LOCATION_TRACKING': response = await handleStartLocationTracking(payload); break;
        case 'STOP_LOCATION_TRACKING':  response = await handleStopLocationTracking();   break;
        case 'SHOW_NOTIFICATION':    response = await handleShowNotification(payload);    break;
        case 'PLAY_AUDIO':           response = await handlePlayAudio(payload);           break;
        case 'GO_ONLINE':            response = await handleGoOnline(payload);            break;
        case 'GO_OFFLINE':           response = await handleGoOffline(payload);           break;
        case 'RECONNECT_SOCKET':     response = await handleReconnectSocket(payload);     break;
        case 'DISCONNECT_SOCKET':     response = await handleDisconnectSocket(payload);     break;
        case 'THEME_MODE_CHANGE':    response = await handleChangeThemeMode(payload);     break;
        default: logger.warn(`Unknown message type: ${type}`); response = { error: 'Unknown message type' };
      }
      if (requestId && webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ type, requestId, payload: response?.error ? null : response, error: response?.error || undefined }));
      }
    } catch (error: any) {
      logger.error('Error handling WebView message:', error);
      try {
        const { requestId, type } = JSON.parse(event.nativeEvent.data);
        if (requestId && webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({ type, requestId, payload: null, error: error.message }));
        }
      } catch {}
    }
  };

  const handleInitializeServices = async (payload: any) => {
    try {
      const { userId, frontendName, socketServerUrl } = payload;
      logger.info(`Initializing services for ${frontendName}, user: ${userId}`);
      if (servicesInitialized) return { success: true, reason: 'already_initialized' };
      const deviceInfo = await getDeviceInfo();
      const deviceId   = deviceInfo.deviceId;
      deviceIdRef.current     = deviceId;
      userIdRef.current       = userId;
      frontendNameRef.current = frontendName;
      LocationService.setDeviceId(deviceId);
      const permissionsGranted = await PermissionManager.requestCriticalPermissions(frontendName);
      if (!permissionsGranted.location) return { success: false, error: 'Location permission required', permissions: permissionsGranted };
      const socketUrl       = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
      const servicesStarted = await BackgroundService.start({ deviceId, userId, frontendName, socketServerUrl: socketUrl });
      if (!servicesStarted) return { success: false, error: 'Failed to start services' };
      setupSocketListeners(deviceId, frontendName);
      setServicesInitialized(true);
      logger.info('✅ Services initialized successfully');
      return { success: true, deviceId, permissions: permissionsGranted, socketConnected: DeviceSocketService.isConnected() };
    } catch (error: any) { return { success: false, error: error.message }; }
  };

  const handleRequestPermission  = async (payload: any) => { try { return { status: await PermissionManager.request(payload.permissionType) }; } catch (error: any) { return { status: 'denied', error: error.message }; } };
  const handleCheckPermission     = async (payload: any) => ({ status: await PermissionManager.check(payload.permissionType) });
  const handleLogDataFromWebView  = async (payload: any) => { console.log('Log from webview', payload); return { success: true }; };
  const handleChangeThemeMode     = async (payload: any) => { setAppBackGroundColor(payload.color); return { success: true }; };
  const handleGetCurrentLocation  = async () => { try { const l = await LocationService.getCurrentLocation(); if (!l) return { error: 'Could not get location' }; return l; } catch (error: any) { return { error: error.message }; } };
  const handleStartLocationTracking = async (payload: any) => { try { if (!deviceIdRef.current) throw new Error('Device not initialized'); return { success: await LocationService.startPersistentTracking(deviceIdRef.current) }; } catch (error: any) { return { success: false, error: error.message }; } };
  const handleStopLocationTracking  = async ()             => { try { await LocationService.stopPersistentTracking(); return { success: true }; } catch (error: any) { return { success: false, error: error.message }; } };
  const handleShowNotification    = async (payload: any) => { try { await NotificationService.show(payload); return { success: true }; } catch (error: any) { return { success: false, error: error.message }; } };
  const handlePlayAudio           = async (payload: any) => { try { await AudioService.playAlert(payload.soundFile); return { success: true }; } catch (error: any) { return { success: false, error: error.message }; } };

  const teardownSocketListeners = useCallback(() => {
    logger.info('Tearing down socket listeners');
    // Remove every event you registered in setupSocketListeners
    DeviceSocketService.off(SOCKET_EVENTS.CONNECTION.GET_CURRENT_LOCATION);
    DeviceSocketService.off('showNotification');
    DeviceSocketService.off('showDrawOver');

    // Ride events
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.REQUEST_CREATED);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.REQUEST_NEW);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.REQUEST_RECEIVED);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.ACCEPTED);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.TAKEN);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.TRIP_STARTED);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.TRIP_COMPLETED);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.CANCELLED);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.ACCEPT_SUCCESS);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.DECLINE_SUCCESS);
    DeviceSocketService.off(SOCKET_EVENTS.RIDE.PAYMENT_REQUESTED);

    // Driver events
    DeviceSocketService.off(SOCKET_EVENTS.DRIVER.ARRIVED);
    DeviceSocketService.off(SOCKET_EVENTS.DRIVER.LOCATION_UPDATED);
    DeviceSocketService.off(SOCKET_EVENTS.DRIVER.ONLINE_SUCCESS);
    DeviceSocketService.off(SOCKET_EVENTS.DRIVER.OFFLINE_SUCCESS);
    DeviceSocketService.off(SOCKET_EVENTS.DRIVER.FORCED_OFFLINE);
    DeviceSocketService.off(SOCKET_EVENTS.DRIVER.SESSION_REPLACED);

    // Rider events
    DeviceSocketService.off(SOCKET_EVENTS.RIDER.LOCATION_UPDATED);
    DeviceSocketService.off(SOCKET_EVENTS.RIDER.SESSION_REPLACED);

    // Delivery events
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.REQUEST_SENT);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.REQUEST_RECEIVED);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.ACCEPTED);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.TAKEN);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.DRIVER_ARRIVED);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.STARTED);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.COMPLETED);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.CANCELLED);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.NO_DRIVERS);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.PAYMENT_REQUESTED);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.PAYMENT_RECEIVED);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.ONLINE_SUCCESS);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.OFFLINE_SUCCESS);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.FORCED_OFFLINE);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.LOCATION_UPDATED);
    DeviceSocketService.off(SOCKET_EVENTS.DELIVERY.SESSION_REPLACED);

    // Shared events
    DeviceSocketService.off(SOCKET_EVENTS.PAYMENT.PAYMENT_RECEIVED);
    DeviceSocketService.off(SOCKET_EVENTS.PAYMENT.SUCCESS);
    DeviceSocketService.off(SOCKET_EVENTS.PAYMENT.FAILED);
    DeviceSocketService.off(SOCKET_EVENTS.WITHDRAWAL.PROCESSED);
    DeviceSocketService.off(SOCKET_EVENTS.SUBSCRIPTION.EXPIRING_WARNING);
    DeviceSocketService.off(SOCKET_EVENTS.SUBSCRIPTION.EXPIRED);
    DeviceSocketService.off(SOCKET_EVENTS.SUBSCRIPTION.ACTIVATED);
    DeviceSocketService.off(SOCKET_EVENTS.RATING.REQUEST);
    DeviceSocketService.off(SOCKET_EVENTS.RATING.SUBMITTED);
    DeviceSocketService.off(SOCKET_EVENTS.NOTIFICATION.NEW);
    DeviceSocketService.off(SOCKET_EVENTS.NOTIFICATION.BROADCAST);
    DeviceSocketService.off(SOCKET_EVENTS.SOS.TRIGGERED);
    DeviceSocketService.off(SOCKET_EVENTS.SOS.ACKNOWLEDGED);
    DeviceSocketService.off(SOCKET_EVENTS.AFFILIATE.REFERRAL_SIGNUP);
    DeviceSocketService.off(SOCKET_EVENTS.AFFILIATE.COMMISSION_EARNED);
    DeviceSocketService.off(SOCKET_EVENTS.SYSTEM.ANNOUNCEMENT);
    DeviceSocketService.off(SOCKET_EVENTS.CONDUCTOR.SESSION_REPLACED);
    DeviceSocketService.off(SOCKET_EVENTS.CONNECTED);
    DeviceSocketService.off(SOCKET_EVENTS.DISCONNECTED);
    DeviceSocketService.off('socket_error');

    logger.info('✅ All socket listeners removed');
  }, [])

  const handleDisconnectSocket =  async (payload: any) => {
    try {
      const { userId, frontendName } = payload;
      logger.info(`Socket disconnected for ${frontendName}, user: ${userId}`);
      DeviceSocketService.disconnect();
      teardownSocketListeners() // remove all redundunt socket event listeners
      userIdRef.current       = null;
      frontendNameRef.current = null;   
      logger.info('✅ Socket re-initialized successfully');
      return { success: true, socketConnected: DeviceSocketService.isConnected() };
    } catch (error: any) { return { success: false, error: error.message }; }
  }
  

  const handleReconnectSocket = async (payload: any) => {
    try {
      const { userId, frontendName, socketServerUrl } = payload;
      logger.info(`Socket re-initializing for ${frontendName}, user: ${userId}`);
      await handleDisconnectSocket({userId, frontendName}) // first disconnect socket and remove all listerners and handlers, then proceed
      const deviceInfo = await getDeviceInfo()
      const deviceId = deviceInfo.deviceId
      deviceIdRef.current = deviceId
      userIdRef.current = userId
      frontendNameRef.current = frontendName;
      LocationService.setDeviceId(deviceId);
      const socketUrl = socketServerUrl || CONSTANTS.DEVICE_SOCKET_URL;
      //await BackgroundService.start({ deviceId, userId, frontendName, socketServerUrl: socketUrl });
      await DeviceSocketService.connect(socketUrl)
      setupSocketListeners(deviceId, frontendName) 
      await DeviceSocketService.registerDevice({ deviceId, userId, userType: frontendName, frontendName, notificationToken: null, deviceInfo, socketServerUrl: socketUrl });
      logger.info('✅ Socket re-initialized successfully');
      return { success: true, deviceId, socketConnected: DeviceSocketService.isConnected() };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  const handleGoOnline = async (payload: any) => {
    try {
      const location = await LocationService.getCurrentLocation();
      if (!location) throw new Error('Cannot get current location');
      await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.ONLINE, { driverId: userIdRef.current, location: { lat: location.coords.latitude, lng: location.coords.longitude } });
      if (deviceIdRef.current) {
        const trackingStarted = await LocationService.startPersistentTracking(deviceIdRef.current);
        if (trackingStarted) { isOnlineRef.current = true; await FloatingBubbleService.start(); }
      }
      return { success: true, location: { lat: location.coords.latitude, lng: location.coords.longitude } };
    } catch (error: any) { return { success: false, error: error.message }; }
  };

  const handleGoOffline = async (payload: any) => {
    try {
      await DeviceSocketService.emit(SOCKET_EVENTS.DRIVER.OFFLINE, { driverId: userIdRef.current });
      if (isOnlineRef.current) { await LocationService.stopPersistentTracking(); await FloatingBubbleService.stop(); isOnlineRef.current = false; }
      return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
  };

  const renderCustomLoader = () => (
  <View style={styles.loaderContainer}>
    {/* Use your GIF or a Lottie animation here */}
    <Image
      source={require('./assets/splash.png')} 
      style={styles.loaderGif} 
    />
  </View>
)

  // ─────────────────────────────────────────────────────────────────────────
  // 404 SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (is404) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>🔍 Sorry</Text>
        <Text style={styles.errorText}>Screen not found</Text>
        <Text style={styles.errorSubtext}>
          The requested screen could not be found on this app.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setIs404(false);
            webViewRef.current?.injectJavaScript(`window.location = ""`);
            //webViewRef.current?.reload();
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasError) {
    return (
     <OfflineScreen
      onRetry={() => {
        webViewRef.current?.injectJavaScript(`window.location = ""`);
        //webViewRef.current?.reload();
      }}
    />
    )
  }

  if (!isConnected) {
    return (
     <OfflineScreen
      onRetry={() => {
        webViewRef.current?.injectJavaScript(`window.location = ""`);
        //webViewRef.current?.reload();
      }}
    />
    )
  }
  

  return (
    <LinearGradient
  colors={[appBackGroundColor, appBackGroundColor, appBackGroundColor]}
  start={{ x: 0.0, y: 0.25 }}
  end={{ x: 0.5, y: 1.0 }}
  locations={[0, 0.5, 1]}           // control color stops
  style={{ flex: 1}}
>
 <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
       {/* ← add this */}
  <ConnectionLostBanner
    visible={hasError || !isConnected}
    onRetry={handleRetry}
    message={!isConnected ? 'No internet connection' : 'Connection lost'}
  />    
     <SafeAreaView style={[styles.container, { backgroundColor: appBackGroundColor }]}>

      <WebView
        ref={webViewRef}
        source={{ uri: FRONTEND_URL }}
        onShouldStartLoadWithRequest={(request) => {
        const url = request.url;
        // Handle phone calls
        if (url.startsWith('tel:') || url.includes('wa.me') || url.startsWith('mailto:')) {
           Linking.openURL(url);
           return false;
         }

         return true;
       }}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        startInLoadingState={true}
        renderLoading={renderCustomLoader}
        originWhitelist={['*']}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        style={styles.webview}
        onNavigationStateChange={(navState) => {
          setCurrentUrl(navState.url)
          setCanGoBack(navState.canGoBack)
        }}
        onLoadStart={() => {
          setHasError(false)
          setIs404(false)
        }}
        onError={(e) => { logger.error('WebView error:', e.nativeEvent); setHasError(true); }}
        onLoadEnd={() => { logger.info('loading ended'); setIsLoading(false); }}
        onHttpError={(e) => {
          const statusCode = e.nativeEvent.statusCode;
          const errorUrl   = e.nativeEvent.url;
          logger.error('WebView HTTP error:', statusCode);
          if (statusCode === 404 && (errorUrl === currentUrl || errorUrl === FRONTEND_URL)) {
            setIs404(true);
          } else {
            logger.warn('HTTP error on subresource or non-404:', statusCode, errorUrl);
          }
        }}
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        mixedContentMode="always"
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
      />
     </SafeAreaView>
      {/* Ride request modal */}
      {frontendNameRef.current === "rider"? null : <RideRequestModal
        open={showRideRequestModal}
        rideRequest={currentRideRequest}
        onAccept={handleAcceptRide}
        onDecline={handleDeclineRide}
      />}

      {/* Delivery request modal */}
      {frontendNameRef.current === "rider"? null : <DeliveryRequestModal
        open={showDeliveryRequestModal}
        deliveryRequest={currentDeliveryRequest}
        onAccept={handleAcceptDelivery}
        onDecline={handleDeclineDelivery}
      />}
      <PermissionsVideoModal frontendBaseUrl={FRONTEND_URL} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#FFFFFF' },
  webview:          { flex: 1 },
  errorContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 24 },
  errorTitle:       { fontSize: 48, marginBottom: 16 },
  errorText:        { fontSize: 18, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 },
  errorSubtext:     { fontSize: 14, color: '#666666', textAlign: 'center', marginBottom: 24 },
  retryButton:      { backgroundColor: '#667eea', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  retryButtonText:  { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  offlineContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 24 },
  offlineTitle:     { fontSize: 48, marginBottom: 16 },
  offlineText:      { fontSize: 16, color: '#666666', textAlign: 'center' },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff', // Change this to match your splash color
    zIndex: 999, // Ensures it stays on top of the webview
  },
  loaderGif: {
    width: 200, // Adjust size as needed
    height: 200,
  }
});