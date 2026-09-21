package expo.modules.wolsender

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
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
