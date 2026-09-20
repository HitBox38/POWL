import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeMac, normalizeDeviceFields, validateDeviceFields } from '../lib/device-form.ts';
const fields = { name: ' PC ', macAddress: 'aabb.ccdd.eeff', broadcastIp: '192.168.001.255' };
test('normalizes supported pasted MAC formats', () => {
  for (const mac of [' aa:bb:cc:dd:ee:ff ', 'aa-bb-cc-dd-ee-ff', 'aabb.ccdd.eeff', 'aabbccddeeff']) {
    assert.equal(normalizeMac(mac), 'AA:BB:CC:DD:EE:FF');
  }
  assert.deepEqual(normalizeDeviceFields(fields), {name: 'PC', macAddress: 'AA:BB:CC:DD:EE:FF', broadcastIp: '192.168.1.255'});
});
test('rejects malformed MAC and IPv4 addresses', () => {
  for (const mac of ['AA:BB-CC:DD:EE:FF', 'AA:BB:CC:DD:EE:GG', 'aabbccddeeffjunk', '']) {
    assert.ok(validateDeviceFields({...fields, macAddress: mac}, []).macAddress);
  }
  for (const ip of ['256.1.1.1', '1.2.3', '1.2.3.4.5', '1.2.3.-1', '1.2.3.']) {
    assert.ok(validateDeviceFields({...fields, broadcastIp: ip}, []).broadcastIp);
  }
});
test('detects duplicates across MAC formats but allows editing the same device', () => {
  const devices = [{id: 'one', macAddress: 'aa-bb-cc-dd-ee-ff'}];
  assert.ok(validateDeviceFields(fields, devices).macAddress);
  assert.deepEqual(validateDeviceFields(fields, devices, 'one'), {});
  assert.ok(validateDeviceFields({...fields, name: '  '}, []).name);
});
