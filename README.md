# POWL

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

## Expo development

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
