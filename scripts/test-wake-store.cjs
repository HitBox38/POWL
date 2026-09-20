const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual Zustand/persist store with only native I/O substituted.
async function createStore(sender, saved) {
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
