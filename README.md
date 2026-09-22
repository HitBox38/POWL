# POWL — Privacy-Oriented Wake-on-LAN

POWL is an Android Wake-on-LAN app for waking computers on your local network. Save a computer's name, MAC address, and broadcast IP, then tap **Wake** to send a magic packet from your phone.

Built with Expo, React Native, and TypeScript, with a Kotlin module for sending UDP packets. Device information stays in local storage; no account or backend is required.

## Features

- Add devices with a friendly name, MAC address, and IPv4 broadcast address.
- Validate device details before saving, with support for colon- or hyphen-separated MAC addresses.
- Keep your device list across app restarts using Zustand and AsyncStorage.
- Send Wake-on-LAN packets with one tap and see sending, success, or error feedback.
- Retry failed sends and remove saved devices with confirmation.
- Favorite and group devices, wake a group, and select saved network profiles manually.
- Review per-device wake history and setup/troubleshooting help.
- Follow the Windows/Linux/other setup walkthrough, then use per-device guided diagnosis to check network access, verify status while awake, and run a sleep-to-wake test. Firmware and power settings require checking on the computer itself.
- Import/export device backups, transfer a device by QR code, and configure the Android home-screen widget.
- Choose System, Light, or Dark appearance.
- Configure a native Android Quick Settings wake tile and launcher shortcuts for favorites in Settings → Quick access.
- Wake → connect: save a dashboard URL or supported app link on a device, wake it, wait for a fresh status response, and explicitly open the connection.

### Wake → connect

Open a device → **Wake → connect**, save an `http://`, `https://`, or supported app `scheme://` link, and configure status checks while the computer is awake. **Wake and wait** sends the request and waits up to one minute for a fresh response, then offers **Open connection**. App links require a compatible installed app and its documented URL format. Keep POWL open: leaving the screen, backgrounding, or changing networks cancels the wait. A timeout does not prove that the computer is off. Links are included in backups and QR transfers, and are never opened automatically.

### Android quick access

Rebuild the Android app to include the native tile and shortcut activity. In **Settings → Quick access**, select a tile device and tap **Add Quick Settings tile** (Android 13+), or add **POWL Wake** from the panel’s Edit menu. The tile prompts for unlock when needed. Favorite devices appear when long-pressing the POWL launcher icon: up to four, subject to the launcher’s limit. Supported launchers can pin these shortcuts. Removing a device or favorite disables its pinned shortcut on the next native sync.

Both actions work on a cold start without React Native. They read destinations from private native storage, respect the last selected network profile, and require a local Wi-Fi/Ethernet connection without an active VPN. Profiles remain manual: local connectivity does not prove you are on the target subnet. Results appear in Android toasts/the tile, separately from app wake history. A sent packet never confirms a wake. Changes sync while POWL is open; a sync error in Quick access can be retried by reopening the app.

**“Packet sent!” means the packet was sent, not that the computer is online.** Optional status checks independently show **Online**, **Not reachable**, or **Unknown** while POWL is open.

### Device availability

In Add/Edit device, open **Status checks → Find on network** while the computer is awake. POWL searches for advertised SMB, SSH, VNC, and HTTP services for up to 10 seconds. Select the correct computer by its advertised name, service, and address; discovery does not automatically match a MAC address. If it is missing, choose **Enter IP manually**, using the computer’s own IPv4 address and optionally an open TCP port. Use a stable IP or DHCP reservation for manual targets. IPv6-only discovery results are not supported in this version.

POWL refreshes configured devices every 30 seconds while foregrounded. After sending a wake packet, it checks every three seconds for up to one minute, stopping the faster checks when a response arrives. Device details include **Check now**, the checked endpoint, and last check time. Checks stop in the background, respect selected network profiles, and reset when the network changes. The active connection must be local Wi-Fi or Ethernet; VPN/default cellular connections are reported as unavailable.

**Online** means the selected service or manual address responded. **Not reachable** may mean sleep/shutdown, a stopped service, network isolation, or a firewall blocking probes; it does not prove the computer is off. **Unknown** covers missing setup, unavailable discovery/network access, and explicit permission errors. Status is never inferred from a sent wake packet. Discovered service addresses are refreshed and held only in memory. Saved status-check settings are included in backups and QR transfers; older backups still import without them. Older POWL versions ignore this optional field.

Availability requires rebuilding the Android app with the native module. There is no background service, companion app, account, or backend.

## Using POWL

1. Enable Wake-on-LAN on the target computer in its firmware and network adapter settings, as supported by the hardware.
2. Connect your Android phone to the same local network as the computer.
3. Tap **Add device** and enter:

   | Field | Example | Description |
   | --- | --- | --- |
   | Device Name | `Gaming PC` | A label for your device list. |
   | MAC Address | `AA:BB:CC:DD:EE:FF` | The MAC address of the target computer's network adapter. |
   | Broadcast IP | `255.255.255.255` | Defaults to the local broadcast address. A subnet broadcast address can also be supplied. |

4. Tap **Save device**, then **Test wake** on its details page. Saving does not send a packet. Subsequent wakes take one tap from the device list.

For a `192.168.1.0/24` network, the subnet broadcast address is `192.168.1.255`. Use the address appropriate to your network's subnet mask; it does not always end in `.255`.

The target computer must support waking from its current power state, and the network must allow broadcast traffic between the phone and computer. POWL has no internet relay or remote-access service.

## Platform support and current status

The native sender is implemented for **Android only**. It requires a native app build containing the `WolSender` module; Expo Go cannot provide that custom module. The starter project's iOS and web scripts remain in `package.json`, but packet sending is unavailable on those platforms.

## Install a development APK on Android

Every push to `dev` runs the [Android APK workflow](https://github.com/HitBox38/POWL/actions/workflows/android-apk.yml) and produces a standalone APK, including the native Wake-on-LAN module. It runs without Expo Go, Metro, or a computer connected to your phone.

1. Open the workflow link and select the latest successful run for `dev`.
2. Under **Artifacts**, download `POWL-dev-<run number>` while signed in to GitHub.
3. Extract the ZIP and open the `.apk` on your Android phone. Allow installation from your browser or file manager if Android prompts you.

Artifacts are kept for 30 days. The APK supports ARM64 and ARMv7 phones. For Wake-on-LAN, connect your phone to the target computer's network and enable Wake-on-LAN on that computer.

The workflow builds the release variant so JavaScript and assets are bundled, and signs it with the debug key included in Expo's Android template. This is for personal testing; a Play Store release needs a private release signing key. No Expo account or repository secrets are needed. Builds using the same signing key can update the existing installation. If an older local installation used a different key, Android requires uninstalling it first, which clears its saved devices.

To build the next version, commit your changes on `dev` and push:

```bash
git push origin dev
```

The workflow uses `npm ci` with `package-lock.json`; update that lockfile when changing dependencies. npm is the project's package manager; do not generate a second lockfile with pnpm or Yarn.

## Development

### Prerequisites

- Node.js 22.13+ or 24.3+ and npm (the APK workflow uses Node.js 22).
- An Android development environment with Android Studio, the Android SDK, and a compatible JDK.
- An Android device with USB debugging enabled for testing real Wake-on-LAN behavior on your network.

### Install dependencies

```sh
npm ci --include=dev
```

### Build and run on Android

```sh
npm run android
```

This runs `expo run:android` to build and install the native app. For later JavaScript development, start Metro with:

```sh
npm start
```

Native module changes require rebuilding the Android app.

### Check the code

```sh
npm run lint
npm run typecheck
npm test
```

`npm test` runs the focused JavaScript checks for validation, device transfer, persistence, wake requests, and config plugins. Kotlin tests live in the native module test directory and run with `:wol-sender:testDebugUnitTest` from the generated Android project. End-to-end wake behavior needs verification with an Android device and a Wake-on-LAN-capable computer on the same network.

If a long Android build exhausts JVM Metaspace, run the Kotlin tests separately with more memory. From `android/` in PowerShell:

```powershell
./gradlew.bat :wol-sender:testDebugUnitTest --no-daemon --max-workers=2 '-Dorg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g' '-Pkotlin.compiler.execution.strategy=in-process'
```

The optional icon-generation script uses the pinned `sharp` dev dependency: run `node scripts/generate-icons.js` after installing dependencies.

## How it works

The device card starts a wake action in the Zustand store, which calls the TypeScript wrapper in `modules/wol-sender` and invokes the Kotlin `WolSender` Expo module. The module builds a 102-byte magic packet: six `0xFF` bytes followed by the target MAC address repeated 16 times. It sends the packet through a broadcast-enabled UDP socket to the configured IP on **port 9**. The port is currently fixed.

The `withWolSender` Expo config plugin adds the Android `INTERNET`, `ACCESS_NETWORK_STATE`, and `CHANGE_WIFI_MULTICAST_STATE` permissions. Saved device details are persisted locally under the `powl-devices` storage key; in-flight status resets when the app restarts; completed request history is retained. Availability results are transient and are never restored as current status.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/` | Stack routes for Home, Settings, devices, networks, groups, transfers, and help. |
| `components/add-device-sheet.tsx` | Full-screen add/edit form and validation. |
| `components/device-card.tsx` | Compact device row with isolated subscriptions and one-tap wake. |
| `components/ui/` | Shared UI primitives styled with NativeWind. |
| `store/devices.ts` | Zustand device state and AsyncStorage persistence. |
| `modules/wol-sender/` | TypeScript API and Android Kotlin magic-packet sender. |
| `plugins/withWolSender.js` | Android permissions config plugin used by Expo. |
| `assets/images/` | App icons, splash assets, and branding. |

The app uses Expo SDK 57, React Native 0.86, React 19.2, Expo Router, NativeWind 4, and Zustand 5.

## Dependency maintenance

- Upgrade Expo one SDK at a time and align native packages with `npx expo install --fix`. Use `npx expo install --check` and `npx expo-doctor` to check compatibility. Rebuild the APK after native dependency changes.
- AsyncStorage 3 is intentional: `expo.install.exclude` prevents Expo's compatibility alignment from replacing it with the older 2.x version. Keep `withAsyncStorageRepository` for its bundled Android Maven repository and verify persistence across app upgrades.
- Keep NativeWind 4 with Tailwind CSS 3 and tailwind-merge 2. Moving to NativeWind 5 / Tailwind 4 requires a separate styling migration.
- Keep ESLint 9 while its React/import plugins require it, and TypeScript 6 while typescript-eslint requires TypeScript below 6.1.
- Navigation hooks, themes, and tab types come from `expo-router` entry points. Do not reintroduce application imports from `@react-navigation/*`.
- React Compiler is enabled through `experiments.reactCompiler`; `babel-preset-expo` configures its Babel plugin.

## Navigation and compatibility

Navigation uses Home + Settings with stack pages for longer tasks; Back returns to the previous page. Existing storage keys and the device transfer format are unchanged.
