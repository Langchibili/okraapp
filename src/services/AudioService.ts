//OkraApp\src\services\AudioService.ts
import { createAudioPlayer, setAudioModeAsync, AudioPlayer, InterruptionMode } from 'expo-audio'
import { logger } from '../utils/logger'

// Define sound sources
const SOUND_SOURCES = {
  // ride_request: require('../../assets/sounds/okra_ride_request_1.wav'),
  ride_request: require('../../assets/sounds/okra_ride_request_2.mpeg'),
  notification: require('../../assets/sounds/okra_notification_1.wav'),
  driver_arrived: require('../../assets/sounds/okra_notification_1.wav')
}

type SoundType = keyof typeof SOUND_SOURCES

class AudioService {
  private players: Map<string, AudioPlayer> = new Map()
  private isInitialized: boolean = false

  /**
   * Initialize audio service
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return

      logger.info('Initializing audio service')

      // Set global audio mode for alerts (2026/SDK 54 syntax)
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix' as InterruptionMode,
        shouldRouteThroughEarpiece: false,
      })

      // Pre-load all sounds by creating players
      for (const [key, source] of Object.entries(SOUND_SOURCES)) {
        const player = createAudioPlayer(source)

        player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) {
            logger.info(`Audio '${key}' finished playing`)
          }
        })

        this.players.set(key, player)
        logger.info(`Loaded audio: ${key}`)
      }

      this.isInitialized = true
      logger.info('✅ Audio service initialized')
    } catch (error) {
      logger.error('Error initializing audio service:', error)
    }
  }

  /**
   * Play audio alert
   */
  async playAlert(soundType: SoundType = 'ride_request'): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      const player = this.players.get(soundType)

      if (!player) {
        logger.error(`Audio player not found: ${soundType}`)
        return
      }

      logger.info(`Playing audio alert: ${soundType}`)

      // In expo-audio, if it's already playing, we pause and seek back to 0
      if (player.playing) {
        await Promise.resolve(player.pause())
      }

      await player.seekTo(0)
      await player.play()

      logger.info(`Audio alert '${soundType}' started`)
    } catch (error) {
      logger.error('Error playing audio alert:', error)
    }
  }

  async playRideRequestAlert(): Promise<void> {
    await this.playAlert('ride_request')
  }

  async playNotificationSound(): Promise<void> {
    await this.playAlert('notification')
  }

  /**
   * Stop specific or all alerts
   */
  async stopAlert(soundType?: SoundType): Promise<void> {
    try {
      if (soundType) {
        const player = this.players.get(soundType)
        if (player?.playing) {
          await Promise.resolve(player.pause())
          logger.info(`Audio alert '${soundType}' stopped`)
        }
      } else {
        // Stop all players
        const stopPromises: Promise<void>[] = []
        this.players.forEach((player, key) => {
          if (player.playing) {
            // wrap in Promise.resolve so types align
            stopPromises.push(Promise.resolve(player.pause()))
            logger.info(`Audio alert '${key}' stopped`)
          }
        })
        await Promise.all(stopPromises)
      }
    } catch (error) {
      logger.error('Error stopping audio alert:', error)
    }
  }

  /**
   * Check if any audio is playing
   */
  async isPlaying(): Promise<boolean> {
    for (const player of this.players.values()) {
      if (player.playing) return true
    }
    return false
  }

  /**
   * Check if specific sound is playing
   */
  async isSoundPlaying(soundType: SoundType): Promise<boolean> {
    return this.players.get(soundType)?.playing || false
  }

  /**
   * Cleanup: Unload and release resources
   */
  async cleanup(): Promise<void> {
    try {
      // First, pause all players
      const pausePromises: Promise<void>[] = []
      this.players.forEach((player) => {
        if (player.playing) {
          pausePromises.push(Promise.resolve(player.pause()))
        }
      })
      await Promise.all(pausePromises)

      // Then remove listeners and clear the map
      this.players.forEach((player) => {
        ;(player as any).removeAllListeners()
      })

      this.players.clear()
      this.isInitialized = false
      logger.info('Audio service cleaned up')
    } catch (error) {
      logger.error('Error cleaning up audio:', error)
    }
  }
}

export default new AudioService()
