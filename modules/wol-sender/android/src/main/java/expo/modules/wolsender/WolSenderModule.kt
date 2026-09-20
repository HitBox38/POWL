package expo.modules.wolsender

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WolSenderModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("WolSender")

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
