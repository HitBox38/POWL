import { ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

const withWolSender: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = manifest['uses-permission'];

    const required = [
      'android.permission.INTERNET',
      'android.permission.CHANGE_WIFI_MULTICAST_STATE',
    ];

    for (const perm of required) {
      const alreadyPresent = permissions.some(
        (p: { $?: { 'android:name'?: string } }) =>
          p.$?.['android:name'] === perm
      );
      if (!alreadyPresent) {
        permissions.push({ $: { 'android:name': perm } });
      }
    }

    return modConfig;
  });
};

export default withWolSender;
