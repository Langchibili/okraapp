// OkraApp\src\components\PermissionsVideoModal.tsx
//
// Two responsibilities:
//   1. After all permission prompts complete, ask the user if they want to
//      watch a video showing how to set draw-over permissions.
//   2. If they tap "Watch Video", open a full-screen portrait video player
//      with pause/play and a close button.
//   3. When they close the player, show a bottom toast pointing them to the
//      help page for re-watching later.
//
// Usage in App.tsx:
//   import PermissionsVideoModal, {
//     registerPermissionsVideoHandler,
//   } from './src/components/PermissionsVideoModal';
//
//   // In JSX (inside SafeAreaView):
//   <PermissionsVideoModal frontendBaseUrl="https://okratest.online" />
//
//   // PermissionManager calls registerPermissionsVideoHandler automatically
//   // — you only need to render the component.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL HANDLER REGISTRATION
// PermissionManager calls showPermissionsVideoPrompt() after all prompts finish.
// ─────────────────────────────────────────────────────────────────────────────
type ShowPromptFn = () => void;
let _showPromptHandler: ShowPromptFn | null = null;

export function registerPermissionsVideoHandler(fn: ShowPromptFn): void {
  _showPromptHandler = fn;
}

export function showPermissionsVideoPrompt(): void {
  _showPromptHandler?.();
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO URLS — relative to whatever frontend base URL is passed as a prop
// ─────────────────────────────────────────────────────────────────────────────
const VIDEO_MAIN    = '/assets/how-to-set-draw-over-permissions-hd.mp4';
const VIDEO_SAMSUNG = '/assets/sumsung-permissions-video.mp4';

// ─────────────────────────────────────────────────────────────────────────────
// TOAST — bottom snackbar shown after closing the video player
// ─────────────────────────────────────────────────────────────────────────────
function BottomToast({
  visible,
  onHide,
}: {
  visible: boolean;
  onHide: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
      const t = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: 120,
          duration: 300,
          useNativeDriver: true,
        }).start(onHide);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.toast, { transform: [{ translateY: slideAnim }] }]}
    >
      <Text style={styles.toastText}>
        💡 You can watch the video again from the Help page — tap the{' '}
        <Text style={styles.toastBold}>"?" icon</Text> at the top right of your screen.
      </Text>
      <TouchableOpacity onPress={onHide} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.toastClose}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL-SCREEN VIDEO PLAYER
// ─────────────────────────────────────────────────────────────────────────────
function VideoPlayer({
  uri,
  title,
  onClose,
}: {
  uri: string;
  title: string;
  onClose: () => void;
}) {
  const videoRef                  = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [progress,  setProgress]  = useState(0); // 0–1

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsLoading(false);
    setIsPlaying(status.isPlaying);
    if (status.durationMillis && status.durationMillis > 0) {
      setProgress(status.positionMillis / status.durationMillis);
    }
  }, []);

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  return (
    <View style={styles.playerContainer}>
      <StatusBar hidden />

      {/* Video */}
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onReadyForDisplay={() => setIsLoading(false)}
      />

      {/* Loading spinner */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Controls overlay */}
      <View style={styles.controlsOverlay}>
        {/* Top bar */}
        <View style={styles.controlsTop}>
          <Text style={styles.videoTitle} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        {/* Centre play/pause */}
        <TouchableOpacity onPress={togglePlay} style={styles.playPauseBtn} activeOpacity={0.7}>
          <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PermissionsVideoModal({
  frontendBaseUrl = '',
}: {
  frontendBaseUrl?: string;
}) {
  // Prompt modal state
  const [showPrompt, setShowPrompt] = useState(false);
  // Which video is playing (null = player closed)
  const [activeVideo, setActiveVideo] = useState<{
    uri: string;
    title: string;
  } | null>(null);
  // Toast state
  const [showToast, setShowToast] = useState(false);

  const slideAnim = useRef(new Animated.Value(400)).current;

  // Register handler so PermissionManager can trigger this
  useEffect(() => {
    registerPermissionsVideoHandler(() => setShowPrompt(true));
  }, []);

  // Slide-up animation for prompt
  useEffect(() => {
    if (showPrompt) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 55,
        friction: 9,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [showPrompt]);

  const openVideo = (path: string, title: string) => {
    const uri = frontendBaseUrl
      ? `${frontendBaseUrl.replace(/\/$/, '')}${path}`
      : path;
    setShowPrompt(false);
    setActiveVideo({ uri, title });
  };

  const closePlayer = () => {
    setActiveVideo(null);
    setShowToast(true);
  };

  const dismissPrompt = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowPrompt(false));
  };

  return (
    <>
      {/* ── Prompt sheet ────────────────────────────────────────────────── */}
      <Modal
        visible={showPrompt}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismissPrompt}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          >
            {/* Handle */}
            <View style={styles.handle} />

            {/* Icon */}
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🎬</Text>
            </View>

            <Text style={styles.promptTitle}>Watch Setup Video?</Text>
            <Text style={styles.promptSubtitle}>
              See a short guide showing exactly how to enable the required permissions
              for Okra Rides to work properly.
            </Text>

            {/* Main video button */}
            <TouchableOpacity
              style={styles.videoBtnPrimary}
              onPress={() =>
                openVideo(VIDEO_MAIN, 'How to Set Display Over Apps Permission')
              }
              activeOpacity={0.85}
            >
              <Text style={styles.videoBtnIcon}>▶</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.videoBtnLabel}>Watch Setup Video</Text>
                <Text style={styles.videoBtnSub}>How to enable "Display over apps"</Text>
              </View>
            </TouchableOpacity>

            {/* Samsung fallback */}
            <TouchableOpacity
              style={styles.videoBtnSecondary}
              onPress={() =>
                openVideo(VIDEO_SAMSUNG, 'Samsung: How to Set Permissions')
              }
              activeOpacity={0.85}
            >
              <Text style={styles.videoBtnIconAlt}>▶</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.videoBtnLabelAlt}>
                  Watch this if you can't find "Display over apps"
                </Text>
                <Text style={styles.videoBtnSubAlt}>For Samsung devices</Text>
              </View>
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity onPress={dismissPrompt} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Full-screen video player ─────────────────────────────────────── */}
      <Modal
        visible={!!activeVideo}
        transparent={false}
        animationType="slide"
        statusBarTranslucent
        supportedOrientations={['portrait']}
        onRequestClose={closePlayer}
      >
        {activeVideo && (
          <VideoPlayer
            uri={activeVideo.uri}
            title={activeVideo.title}
            onClose={closePlayer}
          />
        )}
      </Modal>

      {/* ── Bottom toast ─────────────────────────────────────────────────── */}
      <BottomToast visible={showToast} onHide={() => setShowToast(false)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Overlay / Sheet ──────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconEmoji: { fontSize: 30 },
  promptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  promptSubtitle: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // ── Video buttons ────────────────────────────────────────────────────────
  videoBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    backgroundColor: '#667eea',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  videoBtnIcon: {
    fontSize: 20,
    color: '#fff',
  },
  videoBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  videoBtnSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  videoBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    backgroundColor: '#f4f4f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  videoBtnIconAlt: {
    fontSize: 20,
    color: '#667eea',
  },
  videoBtnLabelAlt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  videoBtnSubAlt: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 14,
    color: 'red',
    fontWeight: '600',
  },

  // ── Video player ─────────────────────────────────────────────────────────
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  controlsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginRight: 12,
  },
  closeBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  playPauseBtn: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseIcon: {
    fontSize: 28,
    color: '#fff',
  },
  progressContainer: {
    paddingHorizontal: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },

  // ── Toast ────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    lineHeight: 19,
  },
  toastBold: {
    fontWeight: '800',
    color: '#a78bfa',
  },
  toastClose: {
    color: '#aaa',
    fontSize: 16,
    paddingLeft: 4,
  },
});