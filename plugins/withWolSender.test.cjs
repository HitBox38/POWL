const assert = require('node:assert/strict');
const test = require('node:test');
const withWolSender = require('./withWolSender');

async function applyPlugin(manifest) {
  const config = withWolSender({ name: 'POWL', slug: 'POWL' });
  const result = await config.mods.android.manifest({
    ...config,
    modResults: { manifest },
    modRequest: { platform: 'android', modName: 'manifest', introspect: false },
  });
  return result.modResults.manifest;
}

test('registers a private widget receiver and preserves other app components', async () => {
  const existing = { $: { 'android:name': 'example.ExistingReceiver' } };
  const manifest = { application: [{ receiver: [existing] }] };
  const result = await applyPlugin(manifest);
  assert.deepEqual(result.application[0].receiver[0], existing);
  const widget = result.application[0].receiver[1];
  assert.equal(widget.$['android:exported'], 'false');
  assert.equal(widget.$['android:name'], 'expo.modules.wolsender.WakeWidgetProvider');
  assert.equal(widget['meta-data'][0].$['android:resource'], '@xml/powl_wake_widget');
  assert.equal(result['uses-permission'].length, 3);
  await applyPlugin(result);
  assert.equal(result.application[0].receiver.length, 2);
  assert.equal(result['uses-permission'].length, 3);
});
