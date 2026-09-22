import assert from 'node:assert/strict';
import { test } from 'node:test';
import { quickActionsConfig } from '../lib/quick-actions.ts';

const device = { id: 'pc', name: 'PC', macAddress: 'AA:BB:CC:DD:EE:FF', broadcastIp: '255.255.255.255', networkProfileId: 'home' };
const profiles = [{ id: 'home', name: 'Home', broadcastIp: '192.168.2.255' }];

test('quick actions preserve profile destinations and carry mismatch blockers to cold-start actions', () => {
  const config = JSON.parse(quickActionsConfig([device], profiles, null, 'pc'));
  assert.equal(config.devices[0].broadcastIp, '192.168.2.255');
  assert.match(config.devices[0].blocker, /Select your current network/);
  assert.equal(JSON.parse(quickActionsConfig([device], profiles, 'home', 'pc')).devices[0].blocker, null);
});

test('removal clears tile selection; only favorites and the tile device reach native storage', () => {
  assert.deepEqual(JSON.parse(quickActionsConfig([], [], null, 'pc')), { selectedId: null, devices: [] });
  assert.equal(JSON.parse(quickActionsConfig([device], profiles, 'home', null)).devices.length, 0);
  const favorite = { ...device, isFavorite: true };
  assert.equal(JSON.parse(quickActionsConfig([favorite], profiles, 'home', null)).devices[0].favorite, true);
  assert.equal(JSON.parse(quickActionsConfig([device], profiles, 'home', 'pc')).devices[0].favorite, false);
});

test('wake history and availability changes do not republish identical shortcuts', () => {
  const favorite = { ...device, isFavorite: true };
  assert.equal(quickActionsConfig([favorite], profiles, 'home', 'pc'), quickActionsConfig([{ ...favorite, wakeStatus: 'sending', wakeHistory: [1] }], profiles, 'home', 'pc'));
});
