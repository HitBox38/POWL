import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveBroadcastIp, getNetworkMismatch } from '../lib/network-profiles.ts';
const profiles = [{id: 'home', name: 'Home', broadcastIp: '192.168.1.255'}, {id:'office', name:'Office', broadcastIp:'10.1.255.255'}];
const device = {broadcastIp:'255.255.255.255', networkProfileId:'home'};
test('profile destination overrides fallback; unlinked and missing profiles retain device settings', () => {
  assert.equal(resolveBroadcastIp(device, profiles), '192.168.1.255');
  assert.equal(resolveBroadcastIp(device, []), '255.255.255.255');
  assert.equal(resolveBroadcastIp({broadcastIp:'192.168.2.255'}, profiles), '192.168.2.255');
});
test('active network selection never changes the target destination', () => {
  assert.match(getNetworkMismatch(device, profiles, 'office'), /Home.*Office/);
  assert.equal(resolveBroadcastIp(device, profiles), '192.168.1.255');
  assert.equal(getNetworkMismatch(device, profiles, 'home'), null);
  assert.match(getNetworkMismatch(device, profiles, null), /Select your current/);
  assert.equal(getNetworkMismatch({}, profiles, 'office'), null);
  assert.equal(getNetworkMismatch(device, [], null), null);
});
