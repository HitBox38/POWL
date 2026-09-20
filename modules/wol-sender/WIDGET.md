# Android home-screen widget

The POWL Wake widget sends the selected device a UDP magic packet on port 9 without opening the app. Its name and last send result survive launcher updates and app-process restarts. "Sent" only confirms the UDP send, not that the computer woke.

In POWL, open **Home-screen widget**, select a device, and choose **Add to home screen**. Launchers without pin support can add it from their Widgets menu. All POWL widgets currently share one selected device. Choose **No device** to disable waking; removing the selected device also clears the native configuration on the next sync. Tap the device name or result in the widget to open POWL.

The Android module bundles the widget layout and metadata under `android/src/main/res`. `withWolSender` registers a non-exported provider and the existing network permissions during Expo prebuild. Widget wake actions use an explicit, immutable PendingIntent and `goAsync()` with a background executor. The app and widget share the same packet builder and sender. A native app rebuild is required; Expo Go, web, and iOS show an unsupported explanation.

`syncWakeWidget({ id, name, macAddress, broadcastIp } | null)` expects the **resolved** destination for the selected device. The root-mounted sync component waits for persisted devices and widget selection before writing native preferences. Keep that component wired to network-profile resolution when profiles are enabled. Widget requests currently stay in the widget's last-result display; they are not inserted into the app's wake history.

Validation on a device should cover launcher pinning, a packet observed on the local network, editing/removing the selected device, switching its network profile, an app-process restart, duplicate quick taps, and larger Android text settings. Automated checks cover manifest registration/idempotence and native packet construction and validation.
