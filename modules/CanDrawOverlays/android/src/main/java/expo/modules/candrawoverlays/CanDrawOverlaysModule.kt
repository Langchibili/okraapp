package expo.modules.candrawoverlays

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
        true
      }
    }
  }
}
