package expo.modules.wolsender

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.service.quicksettings.TileService
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

internal object QuickWakeActions {
    private const val PREFERENCES = "powl-quick-actions"
    private const val SHORTCUT_PREFIX = "powl-wake-"
    private val executor = Executors.newSingleThreadExecutor()
    private val sending = AtomicBoolean(false)
    private val main = Handler(Looper.getMainLooper())

    private fun config(context: Context): JSONObject = try {
        JSONObject(context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString("config", "{}") ?: "{}")
    } catch (_: Exception) { JSONObject() }

    private fun targets(config: JSONObject): List<JSONObject> {
        val devices = config.optJSONArray("devices") ?: return emptyList()
        return (0 until devices.length()).mapNotNull { devices.optJSONObject(it) }
    }

    fun selectedId(context: Context): String? = config(context).let {
        if (it.isNull("selectedId")) null else it.optString("selectedId").takeIf(String::isNotBlank)
    }

    fun selectedName(context: Context): String? {
        val config = config(context)
        val id = if (config.isNull("selectedId")) null else config.optString("selectedId")
        return targets(config).find { it.optString("id") == id }?.optString("name")
    }

    fun sync(context: Context, payload: String) {
        val config = JSONObject(payload)
        val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        check(preferences.edit().putString("config", config.toString()).commit()) { "Could not save quick actions" }
        TileService.requestListeningState(context, ComponentName(context, WakeTileService::class.java))
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return
        val manager = context.getSystemService(ShortcutManager::class.java) ?: return
        val favorites = targets(config).filter { it.optBoolean("favorite") }
        val liveIds = favorites.map { SHORTCUT_PREFIX + it.getString("id") }.toSet()
        val obsolete = (manager.dynamicShortcuts + manager.pinnedShortcuts)
            .map { it.id }.filter { it.startsWith(SHORTCUT_PREFIX) && it !in liveIds }.distinct()
        if (obsolete.isNotEmpty()) {
            manager.disableShortcuts(obsolete, "Device removed or no longer a favorite. Open POWL to configure it.")
            manager.removeDynamicShortcuts(obsolete)
        }
        if (liveIds.isNotEmpty()) manager.enableShortcuts(liveIds.toList())
        // Skip unchanged successful publication to avoid Android shortcut rate limits on resume.
        val signature = favorites.toString()
        if (preferences.getString("published", null) == signature) return
        fun shortcut(target: JSONObject, rank: Int): ShortcutInfo {
            val id = target.getString("id")
            val label = target.getString("name").take(32)
            val intent = Intent(context, WakeShortcutActivity::class.java)
                .setAction(Intent.ACTION_VIEW)
                .setData(Uri.Builder().scheme("powl-wake").authority("device").appendPath(id).build())
                .putExtra("deviceId", id)
            return ShortcutInfo.Builder(context, SHORTCUT_PREFIX + id)
                .setShortLabel("Wake $label")
                .setLongLabel("Wake ${target.getString("name").take(80)}")
                .setIcon(Icon.createWithResource(context, R.drawable.powl_quick_wake))
                .setRank(rank).setIntent(intent).build()
        }
        val shortcuts = favorites.mapIndexed { index, target -> shortcut(target, index) }
        // Refresh labels/intents for pinned favorites even when they are outside the dynamic limit.
        val pinnedIds = manager.pinnedShortcuts.map { it.id }.toSet()
        if (!manager.updateShortcuts(shortcuts.filter { it.id in pinnedIds })) error("Shortcut update rate limited")
        if (!manager.setDynamicShortcuts(shortcuts.take(minOf(4, manager.maxShortcutCountPerActivity)))) {
            error("Shortcut publication rate limited")
        }
        preferences.edit().putString("published", signature).apply()
    }

    /** Re-read the current private snapshot at execution; intents never carry a MAC or IP. */
    fun wake(context: Context, id: String?, favoriteOnly: Boolean = false, complete: (String) -> Unit) {
        if (!sending.compareAndSet(false, true)) { complete("A quick wake request is already sending."); return }
        val app = context.applicationContext
        executor.execute {
            val message = try {
                val target = targets(config(app)).find { it.optString("id") == id && (!favoriteOnly || it.optBoolean("favorite")) }
                val connectivity = app.getSystemService(ConnectivityManager::class.java)
                val network = connectivity?.activeNetwork
                val caps = network?.let { connectivity.getNetworkCapabilities(it) }
                val local = caps != null && !caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) &&
                    (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET))
                val blocker = QuickWakeRules.blocker(target != null,
                    target?.let { if (it.isNull("blocker")) null else it.optString("blocker") }, local)
                if (blocker != null) blocker else {
                    MagicPacketSender.send(target!!.getString("macAddress"), target.getString("broadcastIp"))
                    "Packet sent to ${target.getString("name")}. Wake is not confirmed."
                }
            } catch (_: Exception) { "Could not send the wake request. Open POWL to check your device and network." }
            finally { sending.set(false) }
            main.post { complete(message) }
        }
    }
}
