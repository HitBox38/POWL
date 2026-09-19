const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Config plugin that adds required Android permissions for Wake-on-LAN UDP broadcast.
 * - INTERNET: required for any network socket
 * - CHANGE_WIFI_MULTICAST_STATE: required to send broadcast/multicast on Wi-Fi
 */
const withWolSender = (config) => {
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
        (p) => p.$?.['android:name'] === perm
      );
      if (!alreadyPresent) {
        permissions.push({ $: { 'android:name': perm } });
      }
    }

    return modConfig;
  });
};

module.exports = withWolSender;
