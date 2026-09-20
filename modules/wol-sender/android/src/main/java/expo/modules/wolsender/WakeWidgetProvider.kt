package expo.modules.wolsender

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.text.DateFormat
import java.util.Date
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class WakeWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        updateAll(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_WAKE) {
            super.onReceive(context, intent)
            return
        }
        if (!sending.compareAndSet(false, true)) return
        val pendingResult = goAsync()
        executor.execute {
            try {
                val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                val id = preferences.getString("id", null)
                val mac = preferences.getString("mac", null)
                val destination = preferences.getString("destination", null)
                if (id == null || mac == null || destination == null) return@execute
                updateAll(context, context.getString(R.string.powl_widget_sending))
                val status = try {
                    MagicPacketSender.send(mac, destination)
                    context.getString(R.string.powl_widget_sent, DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date()))
                } catch (_: Exception) {
                    context.getString(R.string.powl_widget_failed)
                }
                // Do not overwrite status after the selected device changed while sending.
                if (preferences.getString("id", null) == id && preferences.getString("mac", null) == mac &&
                    preferences.getString("destination", null) == destination) {
                    preferences.edit().putString("status", status).apply()
                }
            } finally {
                sending.set(false)
                try {
                    updateAll(context)
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }

    companion object {
        private const val ACTION_WAKE = "expo.modules.wolsender.WAKE_WIDGET"
        private const val PREFERENCES = "powl-wake-widget"
        private val executor = Executors.newSingleThreadExecutor()
        private val sending = AtomicBoolean(false)

        fun configure(context: Context, id: String?, name: String?, mac: String?, destination: String?) {
            val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            val edit = preferences.edit()
            if (id == null || name == null || mac == null || destination == null) {
                edit.clear()
            } else {
                MagicPacketSender.buildPacket(mac)
                require(destination.split('.').let { parts ->
                    parts.size == 4 && parts.all { it.matches(Regex("[0-9]{1,3}")) && it.toInt() in 0..255 }
                }) { "Expected an IPv4 broadcast address" }
                val changed = preferences.getString("id", null) != id || preferences.getString("mac", null) != mac ||
                    preferences.getString("destination", null) != destination
                if (changed) edit.remove("status")
                edit.putString("id", id).putString("name", name).putString("mac", mac).putString("destination", destination)
            }
            check(edit.commit()) { "Widget settings could not be saved" }
            updateAll(context)
        }

        private fun updateAll(context: Context, temporaryStatus: String? = null) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, WakeWidgetProvider::class.java))
            val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            val configured = preferences.getString("id", null) != null
            val views = RemoteViews(context.packageName, R.layout.powl_wake_widget)
            views.setTextViewText(R.id.powl_widget_name, preferences.getString("name", null) ?: context.getString(R.string.powl_widget_unconfigured))
            views.setTextViewText(R.id.powl_widget_status, temporaryStatus ?: preferences.getString("status", null)
                ?: context.getString(if (configured) R.string.powl_widget_ready else R.string.powl_widget_setup))
            views.setTextViewText(R.id.powl_widget_wake, context.getString(if (configured) R.string.powl_widget_wake else R.string.powl_widget_open))
            views.setBoolean(R.id.powl_widget_wake, "setEnabled", !sending.get())
            val openApp = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
                PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            }
            if (openApp != null) {
                views.setOnClickPendingIntent(R.id.powl_widget_name, openApp)
                views.setOnClickPendingIntent(R.id.powl_widget_status, openApp)
            }
            val wakeIntent = Intent(context, WakeWidgetProvider::class.java).setAction(ACTION_WAKE)
            val wake = PendingIntent.getBroadcast(context, 1, wakeIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.powl_widget_wake, if (configured) wake else openApp)
            manager.updateAppWidget(ids, views)
        }
    }
}
