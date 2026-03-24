// modules/CanDrawOverlays/android/src/main/java/com/okraapp/CanDrawOverlaysModule.kt
package com.okraapp

import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CanDrawOverlaysModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CanDrawOverlays")

    AsyncFunction("canDrawOverlays") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(appContext.reactContext)
      } else {
        true // Below Android 6 — permission granted by default
      }
    }
  }
}
