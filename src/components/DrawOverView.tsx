//OkraApp\src\components\DrawOverView.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import DeviceSocketService from '../services/DeviceSocketService';
import DeepLinkService from '../services/DeepLinkService';

interface DrawOverViewProps {
  rideId: number | string;
  rideCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  distance: number;
  riderName: string;
  autoTimeout: number;
  onDismiss: () => void;
}

const { width, height } = Dimensions.get('window');

export const DrawOverView: React.FC<DrawOverViewProps> = ({
  rideId,
  rideCode,
  pickupAddress,
  dropoffAddress,
  estimatedFare,
  distance,
  riderName,
  autoTimeout,
  onDismiss,
}) => {
  const [timeLeft, setTimeLeft] = useState(Math.floor(autoTimeout / 1000));
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Countdown timer
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAccept = async () => {
    try {
      // Send acceptance to backend via socket
      await DeviceSocketService.emit('ride:accept', {
        rideId,
        rideCode,
      });

      // Notify WebView
      DeepLinkService.handleDrawOverAction('accept', { rideId, rideCode }, null);

      // Dismiss overlay
      onDismiss();
    } catch (error) {
      console.error('Error accepting ride:', error);
    }
  };

  const handleDecline = async () => {
    try {
      // Send decline to backend via socket
      await DeviceSocketService.emit('ride:decline', {
        rideId,
        rideCode,
      });

      // Notify WebView
      DeepLinkService.handleDrawOverAction('decline', { rideId, rideCode }, null);

      // Dismiss overlay
      onDismiss();
    } catch (error) {
      console.error('Error declining ride:', error);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>New Ride Request</Text>
          <View style={styles.timer}>
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
        </View>

        {/* Ride Code */}
        <Text style={styles.rideCode}>#{rideCode}</Text>

        {/* Rider Info */}
        <View style={styles.infoSection}>
          <Text style={styles.label}>Rider</Text>
          <Text style={styles.value}>{riderName}</Text>
        </View>

        {/* Pickup */}
        <View style={styles.infoSection}>
          <Text style={styles.label}>📍 Pickup</Text>
          <Text style={styles.value} numberOfLines={2}>{pickupAddress}</Text>
        </View>

        {/* Dropoff */}
        <View style={styles.infoSection}>
          <Text style={styles.label}>🎯 Drop-off</Text>
          <Text style={styles.value} numberOfLines={2}>{dropoffAddress}</Text>
        </View>

        {/* Distance & Fare */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{distance.toFixed(1)} km</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Estimated Fare</Text>
            <Text style={styles.statValue}>K{estimatedFare.toFixed(2)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={handleDecline}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={handleAccept}
          >
            <Text style={styles.acceptText}>Accept Ride</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    width: width * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  timer: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rideCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B00',
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#F5F5F5',
  },
  acceptButton: {
    backgroundColor: '#FF6B00',
  },
  declineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});