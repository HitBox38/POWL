import assert from 'node:assert/strict';
import { canonicalMac, exportDevices, parseDeviceTransfer, planDeviceImport, createDeviceBackupBatches, createDeviceQr } from '../lib/device-transfer.ts';

const device = { name: 'Office PC', macAddress: 'AA:BB:CC:DD:EE:FF', broadcastIp: '192.168.1.255' };
assert.deepEqual(parseDeviceTransfer(exportDevices([device])), [device]);
assert.equal(canonicalMac('aabb.ccdd.eeff'), device.macAddress);
assert.equal(planDeviceImport([device], [{ macAddress: 'aa-bb-cc-dd-ee-ff' }]).skipped, 1);
assert.equal(parseDeviceTransfer(exportDevices([device, device])).length, 1);
assert.throws(() => parseDeviceTransfer('{broken'), /complete POWL/);
assert.throws(() => parseDeviceTransfer(JSON.stringify({ app: 'POWL', version: 2, devices: [device] })), /not supported/);
assert.throws(() => exportDevices([{ ...device, broadcastIp: '999.1.1.1' }]), /IPv4/);
assert.throws(() => exportDevices([{ ...device, macAddress: 'not-a-mac' }]), /MAC/);
assert.throws(() => parseDeviceTransfer('x'.repeat(100001)), /too large/);
const withExtra = { ...device, id: 'old-id', wakeStatus: 'sending', wakeError: 'private diagnostic' };
assert.deepEqual(parseDeviceTransfer(exportDevices([withExtra])), [device]);
const longName = { ...device, name: 'מחשב💻'.repeat(40) };
assert.deepEqual(parseDeviceTransfer(exportDevices([longName])), [longName], 'long names must round-trip without truncation');
assert.equal(createDeviceQr({ ...device, name: 'מחשב💻' }).error, '', 'Unicode QR must generate successfully');
const oversizedQr = createDeviceQr({ ...device, name: 'A'.repeat(4000) });
assert.equal(oversizedQr.image, null);
assert.match(oversizedQr.error, /backup batch/, 'a QR capacity failure must provide a visible alternative');
const manyDevices = Array.from({ length: 205 }, (_, index) => ({
  ...device,
  name: 'PC ' + index,
  macAddress: 'AA:BB:CC:DD:' + Math.floor(index / 256).toString(16).padStart(2, '0').toUpperCase() + ':' + (index % 256).toString(16).padStart(2, '0').toUpperCase(),
}));
const batches = createDeviceBackupBatches(manyDevices);
assert.deepEqual(batches.map(({ start, end }) => [start, end]), [[0, 100], [100, 200], [200, 205]]);
assert.deepEqual(batches.flatMap(batch => parseDeviceTransfer(batch.text)), manyDevices, 'every batch must import and preserve ordering');
assert.equal(createDeviceBackupBatches(manyDevices.slice(0, 100)).length, 1);
assert.deepEqual(createDeviceBackupBatches([]), []);
assert.throws(() => parseDeviceTransfer(JSON.stringify({ app: 'POWL', version: 1, devices: manyDevices.slice(0, 101) })), /1–100/, 'import must keep the 100-device limit');
const largeNames = manyDevices.slice(0, 4).map(entry => ({ ...entry, name: 'A'.repeat(30000) }));
const sizeBatches = createDeviceBackupBatches(largeNames);
assert.equal(sizeBatches.length, 2, 'large names must split by import text size before reaching 100 devices');
assert.deepEqual(sizeBatches.flatMap(batch => parseDeviceTransfer(batch.text)), largeNames);
assert.ok(sizeBatches.every(batch => batch.text.length <= 100000));
assert.throws(() => createDeviceBackupBatches([{ ...device, name: 'A'.repeat(100000) }]), /shorten very long/, 'one oversized device needs an actionable message');
assert.throws(() => exportDevices(largeNames), /too large/, 'exports must never silently exceed the import limit');
console.log('Device transfer validation, batching, long-name and QR checks passed.');
