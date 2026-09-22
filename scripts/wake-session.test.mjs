import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseConnectionUrl } from '../lib/connection.ts';
import { wakeWaitResult } from '../lib/wake-session.ts';
import { exportDevices, parseDeviceTransfer } from '../lib/device-transfer.ts';

test('connection links allow dashboards and app links, rejecting unsafe and malformed destinations', () => {
  for (const url of ['https://192.168.1.10:8006/', 'http://nas.local', 'rdp://full%20address=s:192.168.1.10']) assert.equal(parseConnectionUrl(` ${url} `), url);
  for (const url of ['javascript://alert(1)', 'file:///etc/passwd', 'intent://host', 'powl://device/1', 'https://user:secret@host', 'http://', 'not a link', 'https://host/\npath']) assert.throws(() => parseConnectionUrl(url));
  assert.equal(parseConnectionUrl(' '), undefined);
});

test('wake workflow rejects cached online status and checks in flight, waits for a fresh response, and times out', () => {
  const since = 100_000;
  assert.equal(wakeWaitResult({ status: 'online', checkedAt: since - 1 }, since, since + 1), undefined);
  assert.equal(wakeWaitResult({ status: 'online', checkedAt: since + 1, checking: true }, since, since + 2), undefined);
  assert.equal(wakeWaitResult({ status: 'online', checkedAt: since + 1 }, since, since + 2).phase, 'ready');
  for (const result of [undefined, { status: 'unknown' }, { status: 'unreachable', checkedAt: since + 1 }, { status: 'online', checkedAt: since - 1 }]) {
    assert.equal(wakeWaitResult(result, since, since + 59_999), undefined);
    assert.equal(wakeWaitResult(result, since, since + 60_000).phase, 'timeout');
  }
});

test('connection links round-trip in backups; old backups remain compatible', () => {
  const base = { name: 'PC', macAddress: 'AA:BB:CC:DD:EE:FF', broadcastIp: '255.255.255.255' };
  for (const connectionUrl of [undefined, 'https://nas.local', 'rdp://host']) {
    const device = { ...base, ...(connectionUrl ? { connectionUrl } : {}) };
    assert.deepEqual(parseDeviceTransfer(exportDevices([device])), [device]);
  }
  assert.throws(() => parseDeviceTransfer(JSON.stringify({ app: 'POWL', version: 1, devices: [{ ...base, connectionUrl: 'file:///private' }] })));
});
