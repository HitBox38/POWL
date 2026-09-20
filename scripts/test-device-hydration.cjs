/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the real stores with delayed disk reads; native AsyncStorage is the only mocked service.
function fixture() {
  const readers = new Map();
  const writes = [];
  const storage = {
    getItem: (key) => new Promise((resolve) => readers.set(key, resolve)),
    setItem: async (key, value) => { writes.push({ key, value: JSON.parse(value) }); },
    removeItem: async () => {},
  };
  const modules = {};
  function load(file) {
    const moduleId = `@/${file.replace(/\.ts$/, '')}`;
    if (modules[moduleId]) return modules[moduleId];
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const mod = { exports: {} };
    modules[moduleId] = mod.exports;
    const customRequire = (id) => {
      if (id === '@react-native-async-storage/async-storage') return storage;
      if (id === '@/modules/wol-sender') return { sendMagicPacket: async () => {} };
      if (id.startsWith('@/')) return modules[id] ?? load(`${id.slice(2)}.ts`);
      return require(id);
    };
    new Function('require', 'module', 'exports', code)(customRequire, mod, mod.exports);
    return mod.exports;
  }
  const devicesModule = load('store/devices.ts');
  modules['@/store/devices'] = devicesModule;
  const profilesModule = load('store/network-profiles.ts');
  modules['@/store/network-profiles'] = profilesModule;
  const readiness = load('lib/device-data.ts');
  const hydrate = async (key, state) => {
    readers.get(key)(JSON.stringify({ state, version: 0 }));
    await new Promise(setImmediate);
  };
  return { devices: devicesModule.useDevicesStore, profiles: profilesModule.useNetworkProfilesStore, readiness, hydrate, writes };
}
const profile = { id: 'home', name: 'Home', broadcastIp: '192.168.5.255' };
const device = { id: 'pc', name: 'PC', macAddress: 'AA:BB:CC:DD:EE:FF', broadcastIp: '255.255.255.255', networkProfileId: 'home', wakeStatus: 'idle' };

test('readiness stays false until both stores have loaded, regardless of load order', async () => {
  for (const first of ['powl-devices', 'powl-network-profiles']) {
    const ctx = fixture();
    assert.equal(ctx.readiness.isDeviceDataReady(), false);
    const state = { 'powl-devices': { devices: [device] }, 'powl-network-profiles': { profiles: [profile], activeProfileId: 'home' } };
    await ctx.hydrate(first, state[first]);
    assert.equal(ctx.readiness.isDeviceDataReady(), false);
    const second = first === 'powl-devices' ? 'powl-network-profiles' : 'powl-devices';
    await ctx.hydrate(second, state[second]);
    assert.equal(ctx.readiness.isDeviceDataReady(), true);
  }
});

test('profile mutations cannot overwrite an unfinished storage read', async () => {
  const ctx = fixture();
  ctx.profiles.getState().addProfile({ name: 'Office', broadcastIp: '10.0.0.255' });
  ctx.profiles.getState().setActiveProfile('other');
  assert.equal(ctx.writes.length, 0);
  await ctx.hydrate('powl-network-profiles', { profiles: [profile], activeProfileId: 'home' });
  ctx.devices.getState().removeNetworkProfile('home');
  assert.equal(ctx.profiles.getState().profiles.length, 1);
  assert.equal(ctx.writes.length, 0);
  await ctx.hydrate('powl-devices', { devices: [device] });
  ctx.devices.getState().removeNetworkProfile('home');
  assert.equal(ctx.profiles.getState().profiles.length, 0);
  assert.equal(ctx.profiles.getState().activeProfileId, null);
  assert.equal(ctx.devices.getState().devices[0].broadcastIp, profile.broadcastIp);
  assert.equal(ctx.devices.getState().devices[0].networkProfileId, undefined);
});

