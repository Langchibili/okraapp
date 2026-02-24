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

interface Rider {
  name?: string;
  rating?: number;
  totalRides?: number;
}

interface RideRequest {
  rideId: string;
  riderName?: string;
  rider?: Rider;
  pickupLocation: Location;
  dropoffLocation: Location;
  distance: number;
  estimatedFare: number;
}

interface Props {
  open: boolean;
  rideRequest: RideRequest | null;
  onAccept: (rideId: string) => void;
  onDecline: (rideId: string) => void;
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
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
};

export const RideRequestModal: React.FC<Props> = ({
  open,
  rideRequest,
  onAccept,
  onDecline,
}) => {
  const [countdown, setCountdown] = useState(30);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Vibrate when modal opens with a valid request
  useEffect(() => {
    if (open && rideRequest) {
      Vibration.vibrate([200, 100, 200, 100, 200]);
    }
    return () => { Vibration.cancel(); };
  }, [open, rideRequest]);

  // Countdown timer — resets every time a new request arrives
  useEffect(() => {
    if (!open || !rideRequest) return;

    setCountdown(30);

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, rideRequest?.rideId]); // key on rideId so a new request resets cleanly

  // Progress bar animation
  useEffect(() => {
    if (open && rideRequest) {
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 30000,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(1);
    }
  }, [open, rideRequest?.rideId]);

  // Pulse animation
  useEffect(() => {
    if (open && rideRequest) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => { pulseLoopRef.current?.stop(); };
  }, [open, rideRequest?.rideId]);

  const handleAccept = () => {
    Vibration.cancel();
    if (rideRequest) onAccept(rideRequest.rideId);
  };

  const handleDecline = () => {
    Vibration.cancel();
    if (rideRequest) onDecline(rideRequest.rideId);
  };

  const estimatedDuration = rideRequest ? Math.round((rideRequest.distance / 40) * 60) : 0;
  const riderName = rideRequest
    ? (rideRequest.riderName || rideRequest.rider?.name || 'Rider')
    : 'Rider';

  // ✅ The Modal always renders when open=true.
  // The null guard is INSIDE the Modal so it mounts and triggers animationType="slide"
  // even if rideRequest arrives in a separate render cycle from open=true.
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={handleDecline}
    >
      {rideRequest ? (
        <View style={styles.overlay}>
          <Animated.View style={[styles.modalContainer, { transform: [{ scale: pulseAnim }] }]}>

            {/* Header */}
            <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
              <Text style={styles.headerIcon}>🚗</Text>
              <Text style={styles.headerTitle}>New Ride Request!</Text>
              <TouchableOpacity onPress={handleDecline} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>

            <Text style={styles.timerText}>
              Accept or decline in {countdown} seconds
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    backgroundColor: countdown > 10 ? '#10b981' : '#ef4444',
                  },
                ]}
              />
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Rider Info */}
              <View style={styles.riderCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{riderName[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>{riderName}</Text>
                  <Text style={styles.riderMeta}>
                    ⭐ {rideRequest.rider?.rating?.toFixed(1) || '5.0'} • {rideRequest.rider?.totalRides || 0} rides
                  </Text>
                </View>
              </View>

              {/* Locations */}
              <View style={styles.section}>
                <View style={styles.locationRow}>
                  <View style={[styles.locationIcon, styles.pickupIconBg]}>
                    <Text style={styles.locationIconText}>📍</Text>
                  </View>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>PICKUP</Text>
                    <Text style={styles.locationAddress}>{rideRequest.pickupLocation.address}</Text>
                    {rideRequest.pickupLocation.name && (
                      <Text style={styles.locationName}>{'> '}{rideRequest.pickupLocation.name}</Text>
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
                    <Text style={styles.locationAddress}>{rideRequest.dropoffLocation.address}</Text>
                    {rideRequest.dropoffLocation.name && (
                      <Text style={styles.locationName}>{'> '}{rideRequest.dropoffLocation.name}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{formatDistance(rideRequest.distance * 1000)}</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
                <View style={[styles.statCard, styles.statCardMiddle]}>
                  <Text style={styles.statValue}>{formatETA(estimatedDuration)}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
                <View style={[styles.statCard, styles.fareCard]}>
                  <Text style={[styles.statValue, styles.fareValue]}>{formatCurrency(rideRequest.estimatedFare)}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  modalContainer: {
    width: width - 32,
    maxWidth: 420,
    minHeight: 560,
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
  headerIcon: { fontSize: 24, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: 18, color: '#ffffff', fontWeight: '600' },
  timerText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 2 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  riderMeta: { fontSize: 14, color: '#64748b' },
  section: { marginBottom: 16 },
  locationRow: { flexDirection: 'row' },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickupIconBg: { backgroundColor: '#10b98120' },
  dropoffIconBg: { backgroundColor: '#ef444420' },
  locationIconText: { fontSize: 18 },
  locationDetails: { flex: 1 },
  locationLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 },
  locationAddress: { fontSize: 14, fontWeight: '500', color: '#1e293b', marginBottom: 2 },
  locationName: { fontSize: 13, fontWeight: '300', color: '#64748b' },
  connectingLine: { width: 2, height: 16, backgroundColor: '#cbd5e1', marginLeft: 17, marginVertical: 8 },
  statsContainer: { flexDirection: 'row', marginBottom: 8 },
  statCard: { flex: 1, padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center' },
  statCardMiddle: { marginHorizontal: 8 },
  fareCard: { backgroundColor: '#10b98110' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  fareValue: { color: '#10b981' },
  statLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  button: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  declineButton: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#ef4444', marginRight: 8 },
  declineButtonText: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
  acceptButton: { backgroundColor: '#10b981', marginLeft: 8 },
  acceptButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
})