const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Config plugin that adds required Android permissions for Wake-on-LAN UDP broadcast.
 * - INTERNET: required for any network socket
 * - ACCESS_NETWORK_STATE: invalidate availability when the active network changes
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
      'android.permission.ACCESS_NETWORK_STATE',
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

    const application = manifest.application?.[0];
    if (!application) throw new Error('Wake widget requires an Android application manifest.');
    application.receiver ??= [];
    const receiverName = 'expo.modules.wolsender.WakeWidgetProvider';
    if (!application.receiver.some((receiver) => receiver.$?.['android:name'] === receiverName)) {
      application.receiver.push({
        $: { 'android:name': receiverName, 'android:exported': 'false', 'android:label': '@string/powl_widget_label' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/powl_wake_widget' } }],
      });
    }

    return modConfig;
  });
};

module.exports = withWolSender;
