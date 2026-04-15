package expo.modules.drawover

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Outline
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.text.TextUtils
import android.util.Log
import android.view.*
import android.widget.*
import androidx.core.app.NotificationCompat
import org.json.JSONObject

class FloatingBubbleService : Service() {

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var isShowing = false
    private var pendingBadgeCount = 0

    private val handler = Handler(Looper.getMainLooper())
    private var fadeRunnable: Runnable? = null

    // Fade to IDLE_ALPHA after 1 minute of no activity
    private val FADE_DELAY_MS = 60 * 1000L
    private val IDLE_ALPHA = 0.35f

    companion object {
        private const val TAG = "FloatingBubbleService"

        const val ACTION_START             = "ACTION_START"
        const val ACTION_STOP              = "ACTION_STOP"
        const val ACTION_UPDATE_BADGE      = "ACTION_UPDATE_BADGE"
        const val ACTION_SHOW_RIPPLE       = "ACTION_SHOW_RIPPLE"
        const val ACTION_APP_FOREGROUND    = "ACTION_APP_FOREGROUND"
        const val ACTION_APP_BACKGROUND    = "ACTION_APP_BACKGROUND"
        // New: delivers ride/delivery JSON to the card
        const val ACTION_SHOW_RIDE_CARD    = "ACTION_SHOW_RIDE_CARD"

        const val EXTRA_BADGE_COUNT        = "EXTRA_BADGE_COUNT"
        const val EXTRA_RIDE_JSON          = "EXTRA_RIDE_JSON"

        const val CHANNEL_ID               = "floating_bubble_channel"
        const val NOTIFICATION_ID          = 1001

        private var instance: FloatingBubbleService? = null

        fun isRunning(): Boolean = instance != null

        fun start(context: Context) {
            dispatch(context, Intent(context, FloatingBubbleService::class.java).apply {
                action = ACTION_START
            })
        }

        fun stop(context: Context) {
            context.startService(Intent(context, FloatingBubbleService::class.java).apply {
                action = ACTION_STOP
            })
        }

        fun updateBadge(context: Context, count: Int) {
            context.startService(Intent(context, FloatingBubbleService::class.java).apply {
                action = ACTION_UPDATE_BADGE
                putExtra(EXTRA_BADGE_COUNT, count)
            })
        }

        fun showRipple(context: Context) {
            context.startService(Intent(context, FloatingBubbleService::class.java).apply {
                action = ACTION_SHOW_RIPPLE
            })
        }

        /**
         * Show (or refresh) the floating card with ride/delivery details.
         * rideJson — a JSON string with the ride or delivery payload.
         */
        fun showRideCard(context: Context, rideJson: String) {
            dispatch(context, Intent(context, FloatingBubbleService::class.java).apply {
                action = ACTION_SHOW_RIDE_CARD
                putExtra(EXTRA_RIDE_JSON, rideJson)
            })
        }

        fun notifyAppForeground(context: Context) {
            context.startService(Intent(context, FloatingBubbleService::class.java).apply {
                action = ACTION_APP_FOREGROUND
            })
        }

        fun notifyAppBackground(context: Context) {
            dispatch(context, Intent(context, FloatingBubbleService::class.java).apply {
                action = ACTION_APP_BACKGROUND
            })
        }

        private fun dispatch(context: Context, intent: Intent) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "✅ onCreate()")
        instance = this
        createNotificationChannel()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "⚡ onStartCommand: ${intent?.action}")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForeground(NOTIFICATION_ID, createNotification())
        }

        when (intent?.action) {

            ACTION_START -> {
                // Start without ride data (generic "you're online" card)
                showFloatingCard(null)
            }

            ACTION_STOP -> {
                hideCard()
                cancelFadeTimer()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE)
                } else {
                    @Suppress("DEPRECATION")
                    stopForeground(true)
                }
                stopSelf()
            }

            ACTION_UPDATE_BADGE -> {
                pendingBadgeCount = intent.getIntExtra(EXTRA_BADGE_COUNT, 0)
                Log.d(TAG, "📊 Badge count: $pendingBadgeCount")
            }

            ACTION_SHOW_RIPPLE -> {
                // Wake card back to full opacity & reset fade
                scheduleFade()
                handler.post { floatingView?.animate()?.alpha(1f)?.setDuration(250)?.start() }
            }

            ACTION_SHOW_RIDE_CARD -> {
                val json = intent.getStringExtra(EXTRA_RIDE_JSON)
                // Rebuild card so new ride details are shown
                if (isShowing) hideCard()
                showFloatingCard(json)
            }

            ACTION_APP_FOREGROUND -> {
                // App is visible — hide the overlay
                handler.post { floatingView?.visibility = View.GONE }
                cancelFadeTimer()
            }

            ACTION_APP_BACKGROUND -> {
                // App went to background — reveal the overlay
                handler.post { floatingView?.visibility = View.VISIBLE }
                scheduleFade()
            }
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        hideCard()
        cancelFadeTimer()
        instance = null
        Log.d(TAG, "💀 onDestroy()")
    }

    // ─── Notification (keeps service alive) ───────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                CHANNEL_ID, "Floating Bubble", NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the floating card active"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(ch)
        }
    }

    private fun createNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        else PendingIntent.FLAG_UPDATE_CURRENT
        val pi = PendingIntent.getActivity(this, 0, launchIntent, piFlags)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("You're Online")
            .setContentText("Tap to open OkraRides")
            .setSmallIcon(applicationInfo.icon)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    // ─── Idle-fade timer ──────────────────────────────────────────────────────

    private fun scheduleFade() {
        cancelFadeTimer()
        handler.post { floatingView?.alpha = 1f }
        fadeRunnable = Runnable {
            handler.post {
                floatingView?.animate()
                    ?.alpha(IDLE_ALPHA)
                    ?.setDuration(1500)
                    ?.start()
                Log.d(TAG, "💤 Card faded to idle after 1 min")
            }
        }
        handler.postDelayed(fadeRunnable!!, FADE_DELAY_MS)
    }

    private fun cancelFadeTimer() {
        fadeRunnable?.let {
            handler.removeCallbacks(it)
            fadeRunnable = null
        }
    }

    // ─── Core: show/hide ──────────────────────────────────────────────────────

    private fun showFloatingCard(rideJson: String?) {
        if (isShowing) {
            Log.d(TAG, "Card already showing — skipping")
            return
        }
        Log.d(TAG, "🃏 showFloatingCard()")

        try {
            floatingView = buildCardView(rideJson)

            val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

            val d = resources.displayMetrics.density
            val screenWidth = resources.displayMetrics.widthPixels

            // Card width = screen width minus 5 dp on each side
            val cardWidth = screenWidth - (10 * d).toInt()

            val params = WindowManager.LayoutParams(
                cardWidth,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                // FLAG_NOT_FOCUSABLE: no keyboard, but touch/click still works on child views
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            ).apply {
                // Centre the card both horizontally and vertically on screen
                gravity = Gravity.CENTER
            }

            windowManager?.addView(floatingView, params)
            isShowing = true
            Log.d(TAG, "✅ Floating card added to window")

            scheduleFade()

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error showing card", e)
            isShowing = false
        }
    }

    private fun hideCard() {
        if (floatingView != null && isShowing) {
            try {
                windowManager?.removeView(floatingView)
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error removing card view", e)
            }
            floatingView = null
            isShowing = false
            Log.d(TAG, "✅ Card hidden")
        }
    }

    // ─── Card view builder ────────────────────────────────────────────────────

    private fun buildCardView(rideJson: String?): View {
        val d = resources.displayMetrics.density

        // ── Parse ride data ────────────────────────────────────────────────────
        var isDelivery    = false
        var rideCode      = ""
        var riderName     = ""
        var pickupAddress = "Pickup location"
        var dropAddress   = "Dropoff location"
        var fare          = 0.0
        var dist          = 0.0

        rideJson?.let {
            try {
                val json = JSONObject(it)
                isDelivery    = json.optString("type") == "delivery_request"
                rideCode      = json.optString("rideCode", "")
                riderName     = json.optString(if (isDelivery) "senderName" else "riderName", "")
                fare          = json.optDouble("estimatedFare", 0.0)
                dist          = json.optDouble("distance", 0.0)

                val pickup  = json.optJSONObject("pickupLocation")
                pickupAddress = pickup?.optString("address")
                    ?: json.optString("pickupAddress", "Pickup location")

                val dropoff = json.optJSONObject("dropoffLocation")
                dropAddress   = dropoff?.optString("address")
                    ?: json.optString("dropoffAddress", "Dropoff location")

            } catch (e: Exception) {
                Log.e(TAG, "JSON parse error", e)
            }
        }

        // ── Root card ──────────────────────────────────────────────────────────
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                shape      = GradientDrawable.RECTANGLE
                setColor(Color.WHITE)
                cornerRadius = 22 * d
            }
            elevation       = 28f
            clipToOutline   = true
            outlineProvider = ViewOutlineProvider.BACKGROUND
            setPadding(
                (18 * d).toInt(), (18 * d).toInt(),
                (18 * d).toInt(), (20 * d).toInt()
            )
        }

        // ── Top row: centred app icon + close button overlaid ──────────────────
        val topFrame = FrameLayout(this).apply {
            layoutParams = lp(w = LinearLayout.LayoutParams.MATCH_PARENT, bottomMargin = (14 * d).toInt())
        }

        // Small circular app icon, centred
        val iconPx = (34 * d).toInt()
        ImageView(this).apply {
            layoutParams  = FrameLayout.LayoutParams(iconPx, iconPx, Gravity.CENTER_HORIZONTAL)
            try { setImageDrawable(packageManager.getApplicationIcon(applicationInfo)) } catch (_: Exception) {}
            setPadding(5, 5, 5, 5)
            background    = ovalDrawable("#FF6B00")
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, out: Outline) = out.setOval(0, 0, view.width, view.height)
            }
        }.also { topFrame.addView(it) }

        // Close (✕) button, top-right
        val closePx = (28 * d).toInt()
        TextView(this).apply {
            layoutParams  = FrameLayout.LayoutParams(closePx, closePx, Gravity.END or Gravity.TOP)
            text          = "✕"
            textSize      = 11f
            setTextColor(Color.parseColor("#999999"))
            gravity       = Gravity.CENTER
            background    = ovalDrawable("#F0F0F0")
            setOnClickListener {
                cancelFadeTimer()
                hideCard()
            }
        }.also { topFrame.addView(it) }

        card.addView(topFrame)

        // ── Orange header badge ────────────────────────────────────────────────
        val headerText = if (isDelivery) "📦  NEW DELIVERY REQUEST" else "🚗  NEW RIDE REQUEST"
        TextView(this).apply {
            text      = headerText
            textSize  = 13f
            setTextColor(Color.WHITE)
            gravity   = Gravity.CENTER
            typeface  = Typeface.DEFAULT_BOLD
            background = pillDrawable("#FF6B00", 24 * d)
            setPadding((14 * d).toInt(), (10 * d).toInt(), (14 * d).toInt(), (10 * d).toInt())
            layoutParams = lp(
                w           = LinearLayout.LayoutParams.MATCH_PARENT,
                bottomMargin = if (rideCode.isNotEmpty()) (6 * d).toInt() else (14 * d).toInt()
            )
        }.also { card.addView(it) }

        // Ride / delivery code
        if (rideCode.isNotEmpty()) {
            TextView(this).apply {
                text     = rideCode
                textSize = 11f
                setTextColor(Color.parseColor("#BBBBBB"))
                gravity  = Gravity.CENTER
                layoutParams = lp(w = LinearLayout.LayoutParams.MATCH_PARENT, bottomMargin = (14 * d).toInt())
            }.also { card.addView(it) }
        }

        // ── Divider ────────────────────────────────────────────────────────────
        card.addView(divider(d))

        // ── Rider / sender name ────────────────────────────────────────────────
        LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.CENTER_VERTICAL
            layoutParams = lp(w = LinearLayout.LayoutParams.MATCH_PARENT,
                topMargin = (13 * d).toInt(), bottomMargin = (13 * d).toInt())
        }.also { row ->
            TextView(this).apply {
                text     = if (isDelivery) "📦" else "👤"
                textSize = 18f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { rightMargin = (10 * d).toInt() }
            }.also { row.addView(it) }

            TextView(this).apply {
                text     = riderName.ifEmpty { if (isDelivery) "Sender" else "Rider" }
                textSize = 15f
                setTextColor(Color.parseColor("#1A1A1A"))
                typeface = Typeface.DEFAULT_BOLD
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }.also { row.addView(it) }

            card.addView(row)
        }

        // ── Divider ────────────────────────────────────────────────────────────
        card.addView(divider(d))

        // ── Route: pickup → connector → dropoff ────────────────────────────────
        LinearLayout(this).apply {
            orientation  = LinearLayout.VERTICAL
            layoutParams = lp(w = LinearLayout.LayoutParams.MATCH_PARENT,
                topMargin = (14 * d).toInt(), bottomMargin = (14 * d).toInt())
        }.also { col ->
            col.addView(addressRow(d, "📍", pickupAddress))

            // Thin vertical connector line
            View(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    (2 * d).toInt(), (18 * d).toInt()
                ).apply {
                    leftMargin   = (9 * d).toInt()
                    topMargin    = (3 * d).toInt()
                    bottomMargin = (3 * d).toInt()
                }
                setBackgroundColor(Color.parseColor("#E0E0E0"))
            }.also { col.addView(it) }

            col.addView(addressRow(d, "🎯", dropAddress))
            card.addView(col)
        }

        // ── Divider ────────────────────────────────────────────────────────────
        card.addView(divider(d))

        // ── Fare + Distance ────────────────────────────────────────────────────
        LinearLayout(this).apply {
            orientation  = LinearLayout.HORIZONTAL
            gravity      = Gravity.CENTER_VERTICAL
            layoutParams = lp(w = LinearLayout.LayoutParams.MATCH_PARENT,
                topMargin = (13 * d).toInt(), bottomMargin = (13 * d).toInt())
        }.also { row ->
            TextView(this).apply {
                text     = "💰  K${"%.2f".format(fare)}"
                textSize = 15f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#1A1A1A"))
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }.also { row.addView(it) }

            TextView(this).apply {
                text     = "${"%.1f".format(dist)} km  📏"
                textSize = 14f
                setTextColor(Color.parseColor("#666666"))
                gravity  = Gravity.END
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }.also { row.addView(it) }

            card.addView(row)
        }

        // ── Divider ────────────────────────────────────────────────────────────
        card.addView(divider(d))

        // ── Single CTA — opens the app so the in-app modal handles accept/decline ─
        val ctaLabel = if (isDelivery) "Tap to Accept or Decline Delivery" else "Tap to Accept or Decline Ride"
        TextView(this).apply {
            text     = ctaLabel
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
            gravity  = Gravity.CENTER
            background = pillDrawable("#FF6B00", 14 * d)
            setPadding((16 * d).toInt(), (16 * d).toInt(), (16 * d).toInt(), (16 * d).toInt())
            layoutParams = lp(
                w            = LinearLayout.LayoutParams.MATCH_PARENT,
                topMargin    = (16 * d).toInt(),
                bottomMargin = (6 * d).toInt()
            )
            setOnClickListener { openApp() }
        }.also { card.addView(it) }

        return card
    }

    // ─── Helper: open main app activity ──────────────────────────────────────

    private fun openApp() {
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            intent?.let { startActivity(it) }
            Log.d(TAG, "✅ App opened from floating card button")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error opening app", e)
        }
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    private fun addressRow(d: Float, icon: String, address: String): LinearLayout =
        LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            TextView(this@FloatingBubbleService).apply {
                text     = icon
                textSize = 14f
                gravity  = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    (22 * d).toInt(), LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { rightMargin = (8 * d).toInt() }
            }.also { addView(it) }
            TextView(this@FloatingBubbleService).apply {
                text     = address
                textSize = 13f
                setTextColor(Color.parseColor("#333333"))
                maxLines = 2
                ellipsize = TextUtils.TruncateAt.END
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }.also { addView(it) }
        }

    private fun divider(d: Float): View = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, (1 * d).toInt()
        ).apply { topMargin = (4 * d).toInt(); bottomMargin = (4 * d).toInt() }
        setBackgroundColor(Color.parseColor("#F0F0F0"))
    }

    /** Shorthand LayoutParams for a LinearLayout child */
    private fun lp(
        w: Int = LinearLayout.LayoutParams.WRAP_CONTENT,
        h: Int = LinearLayout.LayoutParams.WRAP_CONTENT,
        topMargin: Int = 0,
        bottomMargin: Int = 0
    ) = LinearLayout.LayoutParams(w, h).apply {
        this.topMargin    = topMargin
        this.bottomMargin = bottomMargin
    }

    private fun ovalDrawable(hex: String) = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.parseColor(hex))
    }

    private fun pillDrawable(hex: String, radius: Float) = GradientDrawable().apply {
        shape        = GradientDrawable.RECTANGLE
        setColor(Color.parseColor(hex))
        cornerRadius = radius
    }

    private fun borderedPillDrawable(fill: String, stroke: String, radius: Float, strokeWidth: Int) =
        GradientDrawable().apply {
            shape        = GradientDrawable.RECTANGLE
            setColor(Color.parseColor(fill))
            cornerRadius = radius
            setStroke(strokeWidth, Color.parseColor(stroke))
        }
}