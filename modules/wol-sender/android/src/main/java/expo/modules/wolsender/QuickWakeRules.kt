package expo.modules.wolsender

internal object QuickWakeRules {
    fun blocker(exists: Boolean, profileBlocker: String?, localNetwork: Boolean): String? = when {
        !exists -> "This quick action is no longer configured. Open POWL to choose a device."
        !profileBlocker.isNullOrBlank() -> profileBlocker
        !localNetwork -> "Connect to local Wi-Fi or Ethernet without a VPN, then try again."
        else -> null
    }
}
