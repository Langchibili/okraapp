// OkraApp\src\components\DrawOverConfirmModal.tsx
//
// Usage in App.tsx:
//   1. Import:  import DrawOverConfirmModal from './src/components/DrawOverConfirmModal';
//   2. Render:  <DrawOverConfirmModal /> anywhere inside your root view
//
// PermissionManager calls this automatically — no props needed.

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { registerDrawOverConfirmHandler } from '../services/PermissionManager';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Animated toggle component
// Shows a phone screen with a permission toggle being switched ON
// ─────────────────────────────────────────────────────────────────────────────
function ToggleAnimation() {
  const thumbAnim   = useRef(new Animated.Value(0)).current;
  const trackColor  = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const checkAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Loop: off → on → pause → repeat
    const runLoop = () => {
      // Reset to OFF
      thumbAnim.setValue(0);
      trackColor.setValue(0);
      glowAnim.setValue(0);
      checkAnim.setValue(0);
      pulseAnim.setValue(1);

      Animated.sequence([
        Animated.delay(800),
        // Slide thumb + color track simultaneously
        Animated.parallel([
          Animated.spring(thumbAnim, {
            toValue: 1,
            useNativeDriver: false,
            tension: 80,
            friction: 6,
          }),
          Animated.timing(trackColor, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
        ]),
        // Check mark appears
        Animated.timing(checkAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        // Pulse the whole toggle
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 150, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 150, useNativeDriver: true }),
        ]),
        Animated.delay(1800),
      ]).start(() => runLoop());
    };

    runLoop();
  }, []);

  const thumbLeft = thumbAnim.interpolate({ inputRange: [0, 1], outputRange: [3, 27] });
  const trackBg   = trackColor.interpolate({ inputRange: [0, 1], outputRange: ['#ccc', '#4CAF50'] });
  const glowOp    = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });
  const checkOp   = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.animWrapper}>
      {/* Phone outline */}
      <View style={styles.phone}>
        {/* Status bar dots */}
        <View style={styles.statusBar}>
          <View style={styles.statusDot} />
          <View style={styles.statusDot} />
          <View style={styles.statusDot} />
        </View>

        {/* Settings row */}
        <View style={styles.settingsRow}>
          <View style={styles.settingIcon}>
            <Text style={styles.settingIconText}>⚙️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Display over apps</Text>
            <Text style={styles.settingSubLabel}>Okra Rides</Text>
          </View>

          {/* Animated toggle */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            {/* Glow effect behind track */}
            <Animated.View style={[styles.toggleGlow, { opacity: glowOp }]} />
            <Animated.View style={[styles.track, { backgroundColor: trackBg }]}>
              <Animated.View style={[styles.thumb, { left: thumbLeft }]} />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Check mark row */}
        <Animated.View style={[styles.checkRow, { opacity: checkOp }]}>
          <Text style={styles.checkText}>✓  Permission enabled</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────
export default function DrawOverConfirmModal() {
  const [visible,  setVisible]  = useState(false);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    // Register this modal's show function with PermissionManager
    registerDrawOverConfirmHandler(() =>
      new Promise<boolean>((resolve) => {
        setResolver(() => resolve);
        setVisible(true);
      }),
    );
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  const dismiss = (confirmed: boolean) => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      resolver?.(confirmed);
      setResolver(null);
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { /* prevent hardware back dismiss */ }}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🔔</Text>
            <Text style={styles.headerTitle}>Permission Required</Text>
          </View>

          {/* Animation */}
          <ToggleAnimation />

          {/* Message */}
          <Text style={styles.message}>
            You must ensure{' '}
            <Text style={styles.bold}>"Display over other apps"</Text>
            {' '}is enabled for Okra Rides.{'\n\n'}
            This allows Okra to show you incoming ride requests even when you're
            using another app like navigation — so you{' '}
            <Text style={styles.bold}>never miss a ride.</Text>
          </Text>

          {/* Instruction */}
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>
              {'1️⃣  Tap "Go Back to Settings"\n'}
              {'2️⃣  Find "Okra Rides" in the list\n'}
              {'3️⃣  Toggle "Allow display over other apps" ON'}
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => dismiss(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPrimaryText}>✅  Yes, I've Enabled It</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => dismiss(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnSecondaryText}>⚙️  Go Back to Settings</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  headerEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // ── Toggle animation ────────────────────────────────────────────────────
  animWrapper: {
    alignItems: 'center',
    marginVertical: 16,
  },
  phone: {
    width: width * 0.7,
    backgroundColor: '#f4f4f8',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    padding: 12,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#bbb',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconText: {
    fontSize: 16,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  settingSubLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
  toggleGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
  },
  track: {
    width: 52,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    top: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  checkRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  checkText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },

  // ── Message ──────────────────────────────────────────────────────────────
  message: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 14,
  },
  bold: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  instructionBox: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 22,
  },

  // ── Buttons ──────────────────────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
});