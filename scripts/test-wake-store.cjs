/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual Zustand/persist store with only native I/O substituted.
async function createStore(sender, saved, network = { profiles: [], activeProfileId: null }) {
  const storage = new Map(saved ? [['powl-devices', saved]] : []);
  const output = ts.transpileModule(
    readFileSync(path.join(__dirname, '../store/devices.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }
  ).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, Date, Error, String,
    require: (name) => {
      if (name === '@/modules/wol-sender') return { sendMagicPacket: sender };
      if (name === '@/store/network-profiles') return { useNetworkProfilesStore: { getState: () => network, persist: { hasHydrated: () => true } } };
      if (name === '@/lib/network-profiles') {
        const networkExports = {};
        const code = ts.transpileModule(readFileSync(path.join(__dirname, '../lib/network-profiles.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
        vm.runInNewContext(code, { exports: networkExports });
        return networkExports;
      }
      if (name === '@react-native-async-storage/async-storage') return {
        getItem: async (key) => storage.get(key) ?? null,
        setItem: async (key, value) => { storage.set(key, value); },
        removeItem: async (key) => { storage.delete(key); },
      };
      return require(name);
    },
  });
  const store = exports.useDevicesStore;
  await store.persist.rehydrate();
  return { store, storage };
}

const device = { id: 'computer', name: 'Computer', macAddress: 'AA:BB:CC:DD:EE:FF', broadcastIp: '255.255.255.255', wakeStatus: 'idle' };

test('profile destinations are sent and recorded; mismatched networks do not send', async () => {
  const destinations = [];
  const network = { profiles: [{ id: 'home', name: 'Home', broadcastIp: '192.168.4.255' }], activeProfileId: 'home' };
  const { store } = await createStore(async value => { destinations.push(value); }, undefined, network);
  store.setState({ devices: [{ ...device, networkProfileId: 'home' }] });
  await store.getState().wakeDevice(device.id);
  assert.equal(destinations[0].broadcastIp, '192.168.4.255');
  assert.equal(store.getState().devices[0].lastWakeRequest.broadcastIp, '192.168.4.255');
  network.activeProfileId = null;
  await store.getState().wakeDevice(device.id);
  assert.equal(destinations.length, 1);
});

test('successful sends persist their timestamp and destination across restart', async () => {
  const { store, storage } = await createStore(async () => {});
  store.setState({ devices: [{ ...device }] });
  await store.getState().wakeDevice(device.id);
  const request = store.getState().devices[0].lastWakeRequest;
  assert.equal(request.result, 'sent');
  assert.equal(request.macAddress, device.macAddress);
  assert.ok(Number.isFinite(Date.parse(request.requestedAt)));
  const restarted = await createStore(async () => {}, storage.get('powl-devices'));
  assert.equal(restarted.store.getState().devices[0].wakeStatus, 'success');
  assert.equal(restarted.store.getState().devices[0].lastWakeRequest.requestedAt, request.requestedAt);
});

test('in-flight sends are deduplicated and never persisted as sending', async () => {
  let finish;
  let sends = 0;
  const { store, storage } = await createStore(() => { sends++; return new Promise((resolve) => { finish = resolve; }); });
  store.setState({ devices: [{ ...device }] });
  const pending = store.getState().wakeDevice(device.id);
  await store.getState().wakeDevice(device.id);
  assert.equal(sends, 1);
  assert.equal(store.getState().devices[0].wakeStatus, 'sending');
  assert.equal(JSON.parse(storage.get('powl-devices')).state.devices[0].wakeStatus, 'idle');
  finish();
  await pending;
  assert.equal(store.getState().devices[0].wakeStatus, 'success');
});

test('failed requests retain diagnostics and can be retried successfully', async () => {
  let fail = true;
  const { store, storage } = await createStore(async () => { if (fail) throw new Error('Network unreachable'); });
  store.setState({ devices: [{ ...device }] });
  await store.getState().wakeDevice(device.id);
  assert.equal(store.getState().devices[0].lastWakeRequest.result, 'failed');
  const restarted = await createStore(async () => {}, storage.get('powl-devices'));
  assert.equal(restarted.store.getState().devices[0].wakeError, 'Network unreachable');
  fail = false;
  await store.getState().wakeDevice(device.id);
  assert.equal(store.getState().devices[0].wakeStatus, 'success');
  assert.equal(store.getState().devices[0].wakeError, undefined);
});

test('completion after device removal does not recreate it', async () => {
  let finish;
  const { store } = await createStore(() => new Promise((resolve) => { finish = resolve; }));
  store.setState({ devices: [{ ...device }] });
  const pending = store.getState().wakeDevice(device.id);
  store.getState().removeDevice(device.id);
  finish();
  await pending;
  assert.equal(store.getState().devices.length, 0);
});

test('history keeps the latest 20 completed requests and their original destinations', async () => {
  const { store, storage } = await createStore(async () => {});
  store.setState({ devices: [{ ...device }] });
  for (let i = 0; i < 23; i++) {
    store.getState().updateDevice(device.id, { broadcastIp: `192.168.${i}.255` });
    await store.getState().wakeDevice(device.id);
  }
  const history = store.getState().devices[0].wakeHistory;
  assert.equal(history.length, 20);
  assert.equal(history[0].broadcastIp, '192.168.22.255');
  assert.equal(history[19].broadcastIp, '192.168.3.255');
  const restarted = await createStore(async () => {}, storage.get('powl-devices'));
  assert.equal(restarted.store.getState().devices[0].wakeHistory.length, 20);
});

test('adding history preserves the previous feedback-only request', async () => {
  const previous = { requestedAt: '2026-01-01T00:00:00.000Z', result: 'sent', macAddress: device.macAddress, broadcastIp: device.broadcastIp };
  const { store } = await createStore(async () => {});
  store.setState({ devices: [{ ...device, lastWakeRequest: previous }] });
  await store.getState().wakeDevice(device.id);
  assert.equal(store.getState().devices[0].wakeHistory.length, 2);
  assert.equal(store.getState().devices[0].wakeHistory[1].requestedAt, previous.requestedAt);
});

test('clearing history persists and does not cancel an in-flight send', async () => {
  let finish;
  const { store, storage } = await createStore(() => new Promise((resolve) => { finish = resolve; }));
  const previous = { requestedAt: '2026-01-01T00:00:00.000Z', result: 'sent', macAddress: device.macAddress, broadcastIp: device.broadcastIp };
  store.setState({ devices: [{ ...device, wakeStatus: 'success', lastWakeRequest: previous, wakeHistory: [previous] }] });
  const pending = store.getState().wakeDevice(device.id);
  store.getState().clearWakeHistory(device.id);
  assert.equal(store.getState().devices[0].wakeStatus, 'sending');
  assert.equal(store.getState().devices[0].lastWakeRequest, undefined);
  const restarted = await createStore(async () => {}, storage.get('powl-devices'));
  assert.equal(restarted.store.getState().devices[0].wakeStatus, 'idle');
  assert.equal(restarted.store.getState().devices[0].wakeHistory.length, 0);
  finish();
  await pending;
  assert.equal(store.getState().devices[0].wakeHistory.length, 1);
});

test('favorites and group assignments survive restart; group removal preserves devices', async () => {
  const { store, storage } = await createStore(async () => {});
  store.setState({ devices: [{ ...device }] });
  assert.equal(store.getState().addGroup(' Studio '), true);
  assert.equal(store.getState().addGroup('studio'), false);
  const groupId = store.getState().groups[0].id;
  store.getState().toggleFavorite(device.id);
  store.getState().assignGroup(device.id, groupId);
  assert.equal(store.getState().renameGroup(groupId, 'Office'), true);
  assert.equal(store.getState().groups[0].id, groupId);
  const restarted = await createStore(async () => {}, storage.get('powl-devices'));
  assert.equal(restarted.store.getState().devices[0].isFavorite, true);
  assert.equal(restarted.store.getState().devices[0].groupId, groupId);
  assert.equal(restarted.store.getState().groups[0].name, 'Office');
  restarted.store.getState().removeGroup(groupId);
  assert.equal(restarted.store.getState().devices.length, 1);
  assert.equal(restarted.store.getState().devices[0].groupId, undefined);
  assert.equal(restarted.store.getState().devices[0].isFavorite, true);
});

test('legacy device storage defaults to no groups and invalid group assignments are ignored', async () => {
  const { store } = await createStore(async () => {}, JSON.stringify({ state: { devices: [device] }, version: 0 }));
  assert.equal(store.getState().groups.length, 0);
  assert.equal(store.getState().devices[0].isFavorite, undefined);
  store.getState().assignGroup(device.id, 'missing');
  assert.equal(store.getState().devices[0].groupId, undefined);
  assert.equal(store.getState().addGroup('   '), false);
  assert.equal(store.getState().addGroup('a'.repeat(41)), false);
});

test('group wake reports sent, failed, skipped and leaves nonmembers alone', async () => {
  let sends = 0;
  const { store } = await createStore(async (destination) => {
    sends++;
    if (destination.broadcastIp === '192.168.2.255') throw new Error('unreachable');
  });
  store.setState({
    groups: [{ id: 'studio', name: 'Studio' }],
    devices: [
      { ...device, groupId: 'studio' },
      { ...device, id: 'failed', broadcastIp: '192.168.2.255', groupId: 'studio' },
      { ...device, id: 'busy', wakeStatus: 'sending', groupId: 'studio' },
      { ...device, id: 'outside' },
    ],
  });
  const result = await store.getState().wakeGroup('studio');
  assert.equal(result.sent, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.skipped, 1);
  assert.equal(sends, 2);
  assert.equal(store.getState().devices.find((item) => item.id === 'outside').wakeStatus, 'idle');
  assert.equal(store.getState().devices.find((item) => item.id === 'busy').wakeStatus, 'sending');
  const missing = await store.getState().wakeGroup('removed');
  assert.equal(missing.sent + missing.failed + missing.skipped, 0);
});

test('overlapping group wakes do not send duplicate packets', async () => {
  const finish = [];
  const { store } = await createStore(() => new Promise((resolve) => { finish.push(resolve); }));
  store.setState({
    groups: [{ id: 'studio', name: 'Studio' }],
    devices: [{ ...device, groupId: 'studio' }, { ...device, id: 'second', groupId: 'studio' }],
  });
  const first = store.getState().wakeGroup('studio');
  const overlapping = await store.getState().wakeGroup('studio');
  assert.equal(overlapping.sent, 0);
  assert.equal(overlapping.skipped, 2);
  assert.equal(finish.length, 2);
  finish.forEach((resolve) => resolve());
  assert.equal((await first).sent, 2);
  assert.equal(store.getState().devices[0].wakeHistory.length, 1);
});

test('editing and ungrouping during a send preserves edits and records the original destination', async () => {
  let finish;
  const { store } = await createStore(() => new Promise((resolve) => { finish = resolve; }));
  store.setState({ groups: [{ id: 'studio', name: 'Studio' }], devices: [{ ...device, groupId: 'studio' }] });
  const pending = store.getState().wakeGroup('studio');
  store.getState().updateDevice(device.id, { name: 'Renamed', macAddress: '11:22:33:44:55:66', broadcastIp: '192.168.5.255' });
  store.getState().removeGroup('studio');
  finish();
  assert.equal((await pending).sent, 1);
  const current = store.getState().devices[0];
  assert.equal(current.name, 'Renamed');
  assert.equal(current.macAddress, '11:22:33:44:55:66');
  assert.equal(current.broadcastIp, '192.168.5.255');
  assert.equal(current.groupId, undefined);
  assert.equal(current.lastWakeRequest.macAddress, device.macAddress);
  assert.equal(current.lastWakeRequest.broadcastIp, device.broadcastIp);
});

test('removing a group member during send does not recreate it or misreport packet outcome', async () => {
  let finish;
  const { store } = await createStore(() => new Promise((resolve) => { finish = resolve; }));
  store.setState({ groups: [{ id: 'studio', name: 'Studio' }], devices: [{ ...device, groupId: 'studio' }] });
  const pending = store.getState().wakeGroup('studio');
  store.getState().removeDevice(device.id);
  finish();
  const result = await pending;
  assert.equal(result.sent, 1);
  assert.equal(result.skipped, 0);
  assert.equal(store.getState().devices.length, 0);
});

test('adding a device returns its stable saved ID without sending a packet', async () => {
  let sends = 0;
  const { store, storage } = await createStore(async () => { sends++; });
  const id = store.getState().addDevice({ name: 'New PC', macAddress: 'AA:BB:CC:DD:EE:FF', broadcastIp: '255.255.255.255' });
  assert.equal(typeof id, 'string');
  assert.equal(store.getState().devices[0].id, id);
  assert.equal(store.getState().devices[0].wakeStatus, 'idle');
  assert.equal(sends, 0);
  const restarted = await createStore(async () => {}, storage.get('powl-devices'));
  assert.equal(restarted.store.getState().devices[0].id, id);
});

test('a wake changes only its own device reference, preserving unrelated row subscriptions', async () => {
  const { store } = await createStore(async () => {});
  const first = store.getState().addDevice({ name: 'First', macAddress: 'AA:BB:CC:DD:EE:01', broadcastIp: '255.255.255.255' });
  const second = store.getState().addDevice({ name: 'Second', macAddress: 'AA:BB:CC:DD:EE:02', broadcastIp: '255.255.255.255' });
  const original = store.getState().devices.find(device => device.id === second);
  let changes = 0;
  const stop = store.subscribe(state => {
    if (state.devices.find(device => device.id === second) !== original) changes++;
  });
  await store.getState().wakeDevice(first);
  stop();
  assert.equal(changes, 0);
  assert.equal(store.getState().devices.find(device => device.id === first).lastWakeRequest.result, 'sent');
});
