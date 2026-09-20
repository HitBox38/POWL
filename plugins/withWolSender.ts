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

    const application = manifest.application?.[0];
    if (!application) throw new Error('Wake widget requires an Android application manifest.');
    application.receiver ??= [];
    const receiverName = 'expo.modules.wolsender.WakeWidgetProvider';
    if (!application.receiver.some((receiver) => receiver.$?.['android:name'] === receiverName)) {
      // Config-plugin types omit valid receiver label/metadata attributes.
      const widgetReceiver = {
        $: { 'android:label': '@string/powl_widget_label', 'android:name': receiverName, 'android:exported': 'false' as const },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/powl_wake_widget' } }],
      };
      application.receiver.push(widgetReceiver);
    }

    return modConfig;
  });
};

export default withWolSender;
