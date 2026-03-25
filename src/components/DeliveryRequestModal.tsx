// PATH: OkraApp/src/components/DeliveryRequestModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Location {
  address: string;
  name?: string;
  lat: number;
  lng: number;
}

interface Sender {
  name?: string;
  rating?: number;
  totalDeliveries?: number;
}

interface DeliveryRequest {
  deliveryId: string;
  rideCode?: string;
  senderName?: string;
  sender?: Sender;
  pickupLocation: Location;
  dropoffLocation: Location;
  distance: number;
  estimatedFare: number;
  packageType?: string;  // 'standard' | 'midsize' | 'big' | 'large'
  isFragile?: boolean;
  weightKg?: number | null;
  recipientName?: string;
}

interface Props {
  open: boolean;
  deliveryRequest: DeliveryRequest | null;
  onAccept: (deliveryId: string) => void;
  onDecline: (deliveryId: string) => void;
}

const formatCurrency = (amount: number) => `K${amount.toFixed(2)}`;

const formatDistance = (meters: number) => {
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${meters.toFixed(0)} m`;
};

const formatETA = (minutes: number) => {
  if (!minutes && minutes !== 0) return 'Calculating...';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours} hr` : `${hours} hr ${rem} min`;
};

const PACKAGE_LABELS: Record<string, { emoji: string; label: string }> = {
  standard: { emoji: '📦', label: 'Package' },
  midsize:  { emoji: '🛍️', label: 'Big Item (Car)' },
  big:      { emoji: '🚚', label: 'Big Item (Truck)' },
  large:    { emoji: '🏗️', label: 'Cargo' },
};

export const DeliveryRequestModal: React.FC<Props> = ({
  open,
  deliveryRequest,
  onAccept,
  onDecline,
}) => {
  const [countdown, setCountdown]   = useState(60);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Vibrate on open
  useEffect(() => {
    if (open && deliveryRequest) {
      Vibration.vibrate([200, 100, 200, 100, 200]);
    }
    return () => { Vibration.cancel(); };
  }, [open, deliveryRequest]);

  // Countdown — resets per new request
  useEffect(() => {
    if (!open || !deliveryRequest) return;
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); handleDecline(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, deliveryRequest?.deliveryId]);

  // Progress bar
  useEffect(() => {
    if (open && deliveryRequest) {
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0, duration: 60000, useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(1);
    }
  }, [open, deliveryRequest?.deliveryId]);

  // Pulse
  useEffect(() => {
    if (open && deliveryRequest) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => { pulseLoopRef.current?.stop(); };
  }, [open, deliveryRequest?.deliveryId]);

  const handleAccept  = () => { Vibration.cancel(); if (deliveryRequest) onAccept(deliveryRequest.deliveryId); };
  const handleDecline = () => { Vibration.cancel(); if (deliveryRequest) onDecline(deliveryRequest.deliveryId); };

  const estimatedDuration = deliveryRequest
    ? Math.round((deliveryRequest.distance / 30) * 60)  // 30 km/h for delivery
    : 0;

  let senderName = deliveryRequest
    ? (deliveryRequest.senderName || deliveryRequest.sender?.name || 'Sender')
    : 'Sender';
  
  if(senderName === "null null"){
     senderName = "Sender"
  }
  const pkgInfo = deliveryRequest?.packageType
    ? (PACKAGE_LABELS[deliveryRequest.packageType] ?? { emoji: '📦', label: deliveryRequest.packageType })
    : { emoji: '📦', label: 'Package' };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={handleDecline}
    >
      {deliveryRequest ? (
        <View style={styles.overlay}>
          <Animated.View style={[styles.modalContainer, { transform: [{ scale: pulseAnim }] }]}>

            {/* Header — amber delivery gradient */}
            <LinearGradient colors={['#D97706', '#F59E0B']} style={styles.header}>
              <Text style={styles.headerIcon}>🛵</Text>
              <Text style={styles.headerTitle}>New Delivery Request!</Text>
              <TouchableOpacity onPress={handleDecline} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>

            <Text style={styles.timerText}>
              Accept or decline in {countdown} seconds
            </Text>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    backgroundColor: countdown > 10 ? '#F59E0B' : '#ef4444',
                  },
                ]}
              />
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Sender info */}
              <View style={styles.senderCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{senderName[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.senderInfo}>
                  <Text style={styles.senderName}>{senderName}</Text>
                  <Text style={styles.senderMeta}>
                    ⭐ {deliveryRequest.sender?.rating?.toFixed(1) ?? '5.0'} · {deliveryRequest.sender?.totalDeliveries ?? 0} deliveries
                  </Text>
                </View>
                {/* Package badge */}
                <View style={styles.pkgBadge}>
                  <Text style={styles.pkgEmoji}>{pkgInfo.emoji}</Text>
                  <Text style={styles.pkgLabel}>{pkgInfo.label}</Text>
                </View>
              </View>

              {/* Package details row */}
              {(deliveryRequest.isFragile || deliveryRequest.weightKg || deliveryRequest.recipientName) && (
                <View style={styles.pkgDetailsRow}>
                  {deliveryRequest.isFragile && (
                    <View style={styles.pkgTag}>
                      <Text style={styles.pkgTagText}>⚠️ Fragile</Text>
                    </View>
                  )}
                  {deliveryRequest.weightKg != null && (
                    <View style={styles.pkgTag}>
                      <Text style={styles.pkgTagText}>⚖️ {deliveryRequest.weightKg} kg</Text>
                    </View>
                  )}
                  {deliveryRequest.recipientName && (
                    <View style={styles.pkgTag}>
                      <Text style={styles.pkgTagText}>→ {deliveryRequest.recipientName}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Locations */}
              <View style={styles.section}>
                <View style={styles.locationRow}>
                  <View style={[styles.locationIcon, styles.pickupIconBg]}>
                    <Text style={styles.locationIconText}>📍</Text>
                  </View>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>PICKUP</Text>
                    <Text style={styles.locationAddress}>{deliveryRequest.pickupLocation.address}</Text>
                    {deliveryRequest.pickupLocation.name && (
                      <Text style={styles.locationName}>{deliveryRequest.pickupLocation.name}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.connectingLine} />

                <View style={styles.locationRow}>
                  <View style={[styles.locationIcon, styles.dropoffIconBg]}>
                    <Text style={styles.locationIconText}>🎯</Text>
                  </View>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>DROPOFF</Text>
                    <Text style={styles.locationAddress}>{deliveryRequest.dropoffLocation.address}</Text>
                    {deliveryRequest.dropoffLocation.name && (
                      <Text style={styles.locationName}>{deliveryRequest.dropoffLocation.name}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{formatDistance(deliveryRequest.distance * 1000)}</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
                <View style={[styles.statCard, styles.statCardMiddle]}>
                  <Text style={styles.statValue}>{formatETA(estimatedDuration)}</Text>
                  <Text style={styles.statLabel}>Est. Time</Text>
                </View>
                <View style={[styles.statCard, styles.fareCard]}>
                  <Text style={[styles.statValue, styles.fareValue]}>{formatCurrency(deliveryRequest.estimatedFare)}</Text>
                  <Text style={styles.statLabel}>Fare</Text>
                </View>
              </View>
            </ScrollView>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={handleDecline} activeOpacity={0.8}>
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAccept} activeOpacity={0.8}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  modalContainer: {
    width: width - 32,
    maxWidth: 420,
    minHeight: 580,
    maxHeight: height - 100,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerIcon:  { fontSize: 24, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  closeButton: {
    position: 'absolute', right: 16, top: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon:  { fontSize: 18, color: '#ffffff', fontWeight: '600' },
  timerText:  { textAlign: 'center', fontSize: 14, color: '#64748b', paddingHorizontal: 16, paddingVertical: 8 },
  progressContainer: {
    height: 4, backgroundColor: '#e2e8f0',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 2, overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 2 },
  scrollView:  { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },

  // Sender card
  senderCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, backgroundColor: '#FFFBEB',
    borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  senderInfo: { flex: 1 },
  senderName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 3 },
  senderMeta: { fontSize: 13, color: '#64748b' },

  // Package badge on sender card
  pkgBadge: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  pkgEmoji: { fontSize: 18 },
  pkgLabel: { fontSize: 10, fontWeight: '700', color: '#D97706', marginTop: 2 },

  // Package detail tags
  pkgDetailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  pkgTag: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  pkgTagText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  // Locations
  section:     { marginBottom: 14 },
  locationRow: { flexDirection: 'row' },
  locationIcon: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  pickupIconBg:  { backgroundColor: '#10b98120' },
  dropoffIconBg: { backgroundColor: '#ef444420' },
  locationIconText: { fontSize: 18 },
  locationDetails:  { flex: 1 },
  locationLabel:    { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.5, marginBottom: 3 },
  locationAddress:  { fontSize: 14, fontWeight: '500', color: '#1e293b', marginBottom: 2 },
  locationName:     { fontSize: 13, color: '#64748b' },
  connectingLine:   { width: 2, height: 14, backgroundColor: '#cbd5e1', marginLeft: 17, marginVertical: 6 },

  // Stats
  statsContainer: { flexDirection: 'row', marginBottom: 8 },
  statCard:       { flex: 1, padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center' },
  statCardMiddle: { marginHorizontal: 8 },
  fareCard:       { backgroundColor: '#FFFBEB' },
  statValue:      { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  fareValue:      { color: '#F59E0B' },
  statLabel:      { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Buttons
  buttonContainer: {
    flexDirection: 'row', padding: 16,
    borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff',
  },
  button:            { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  declineButton:     { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#ef4444', marginRight: 8 },
  declineButtonText: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
  acceptButton:      { backgroundColor: '#F59E0B', marginLeft: 8 },
  acceptButtonText:  { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});