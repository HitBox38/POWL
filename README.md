# POWL — Privacy-Oriented Wake-on-LAN

POWL is an Android Wake-on-LAN app for waking computers on your local network. Save a computer's name, MAC address, and broadcast IP, then tap **Wake** to send a magic packet from your phone.

Built with Expo, React Native, and TypeScript, with a Kotlin module for sending UDP packets. Device information stays in local storage; no account or backend is required.

## Features

- Add devices with a friendly name, MAC address, and IPv4 broadcast address.
- Validate device details before saving, with support for colon- or hyphen-separated MAC addresses.
- Keep your device list across app restarts using Zustand and AsyncStorage.
- Send Wake-on-LAN packets with one tap and see sending, success, or error feedback.
- Retry failed sends and remove saved devices with confirmation.

**“Packet sent!” means the packet was sent, not that the computer is online.** POWL does not monitor device availability or confirm that a computer woke up.

## Using POWL

1. Enable Wake-on-LAN on the target computer in its firmware and network adapter settings, as supported by the hardware.
2. Connect your Android phone to the same local network as the computer.
3. Tap **+ Add Device** and enter:

   | Field | Example | Description |
   | --- | --- | --- |
   | Device Name | `Gaming PC` | A label for your device list. |
   | MAC Address | `AA:BB:CC:DD:EE:FF` | The MAC address of the target computer's network adapter. |
   | Broadcast IP | `255.255.255.255` | Defaults to the local broadcast address. A subnet broadcast address can also be supplied. |

4. Tap **Add Device**, then **Wake** on its card.

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

The workflow uses `npm ci` with `package-lock.json`; update that lockfile when changing dependencies.

## Development

### Prerequisites

- Node.js 22 and npm (matching the APK workflow).
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
npx tsc --noEmit
```

There is no unified test script in `package.json`; focused checks live in `scripts/`, `plugins/`, and the native module test directory. End-to-end wake behavior needs verification with an Android device and a Wake-on-LAN-capable computer on the same network.

## How it works

The device card starts a wake action in the Zustand store, which calls the TypeScript wrapper in `modules/wol-sender` and invokes the Kotlin `WolSender` Expo module. The module builds a 102-byte magic packet: six `0xFF` bytes followed by the target MAC address repeated 16 times. It sends the packet through a broadcast-enabled UDP socket to the configured IP on **port 9**. The port is currently fixed.

The `withWolSender` Expo config plugin adds the Android `INTERNET` and `CHANGE_WIFI_MULTICAST_STATE` permissions. Saved device details are persisted locally under the `powl-devices` storage key; send status and errors reset when the app restarts.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router layouts and the device-list screen. |
| `components/add-device-sheet.tsx` | Add-device form and validation. |
| `components/device-card.tsx` | Device details, wake action, send feedback, and removal. |
| `components/ui/` | Shared UI primitives styled with NativeWind. |
| `store/devices.ts` | Zustand device state and AsyncStorage persistence. |
| `modules/wol-sender/` | TypeScript API and Android Kotlin magic-packet sender. |
| `plugins/withWolSender.js` | Android permissions config plugin used by Expo. |
| `assets/images/` | App icons, splash assets, and branding. |

The app uses Expo SDK 54, React Native 0.81, React 19, Expo Router, NativeWind, and Zustand.
