package expo.modules.wolsender

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import android.app.StatusBarManager
import android.graphics.drawable.Icon
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class WolSenderModule : Module() {
    private var availabilityManager: AvailabilityManager? = null
    @Synchronized private fun availability(): AvailabilityManager = availabilityManager ?: AvailabilityManager(
        requireNotNull(appContext.reactContext) { "App context is unavailable" }.applicationContext
    ) { event, data -> sendEvent(event, data) }.also { availabilityManager = it }

    override fun definition() = ModuleDefinition {
        Name("WolSender")
        Events("onAvailabilityDiscovery", "onAvailabilityNetwork")
        AsyncFunction("startAvailabilityNetwork") { availability().startNetwork(); Unit }
        AsyncFunction("stopAvailabilityNetwork") { availability().stopNetwork(); Unit }
        AsyncFunction("startAvailabilityDiscovery") { id: String, types: List<String> -> availability().startDiscovery(id, types); Unit }
        AsyncFunction("stopAvailabilityDiscovery") { id: String -> availability().stopDiscovery(id); Unit }
        AsyncFunction("probeAvailability") { id: String, ip: String, port: Int?, promise: Promise -> availability().probe(id, ip, port, promise) }
        AsyncFunction("cancelAvailabilityProbe") { id: String -> availability().cancelProbe(id) }
        OnDestroy { availabilityManager?.close(); availabilityManager = null }
        OnActivityEntersBackground { availabilityManager?.stopNetwork() }

        AsyncFunction("sendMagicPacket") { macAddress: String, broadcastIp: String ->
            MagicPacketSender.send(macAddress, broadcastIp)
        }

        AsyncFunction("syncWakeWidget") { id: String?, name: String?, macAddress: String?, broadcastIp: String? ->
            val context = requireNotNull(appContext.reactContext) { "App context is unavailable" }
            WakeWidgetProvider.configure(context, id, name, macAddress, broadcastIp)
        }

        AsyncFunction("syncQuickActions") { config: String ->
            val context = requireNotNull(appContext.reactContext) { "App context is unavailable" }
            QuickWakeActions.sync(context, config)
        }

        AsyncFunction("requestAddWakeTile") { promise: Promise ->
            val activity = appContext.currentActivity
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || activity == null) promise.resolve(false)
            else {
                activity.runOnUiThread {
                    try {
                        val manager = activity.getSystemService(StatusBarManager::class.java)
                        if (manager == null) promise.resolve(false)
                        else manager.requestAddTileService(
                            ComponentName(activity, WakeTileService::class.java), "POWL Wake",
                            Icon.createWithResource(activity, R.drawable.powl_quick_wake),
                            activity.mainExecutor
                        ) { result -> promise.resolve(result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED ||
                            result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED) }
                    } catch (_: Exception) { promise.resolve(false) }
                }
            }
        }

        AsyncFunction("requestPinWakeWidget") {
            val context = requireNotNull(appContext.reactContext) { "App context is unavailable" }
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                false
            } else {
                val manager = AppWidgetManager.getInstance(context)
                manager.isRequestPinAppWidgetSupported && manager.requestPinAppWidget(
                    ComponentName(context, WakeWidgetProvider::class.java), null, null
                )
            }
        }
    }
}
