import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AvailabilityMonitor } from '../lib/availability-monitor.ts';
import { parseStatusTarget, statusTargetDraft, statusTargetFromDraft, serviceKey } from '../lib/availability.ts';
import { exportDevices, parseDeviceTransfer } from '../lib/device-transfer.ts';
import { ServiceDiscovery } from '../lib/service-discovery.ts';

const flush = () => new Promise(resolve => setImmediate(resolve));
const manual = { kind: 'manual', ip: '192.168.1.10', port: 22 };
const service = { kind: 'service', name: 'Office', serviceType: '_ssh._tcp.' };
const endpoint = { name: 'Office', serviceType: '_ssh._tcp.', ip: '192.168.1.20', port: 22 };
const device = (id, target = manual, revision = id) => ({ id, target, revision });
function harness() {
  let now = 100_000;
  const calls = [], cancelled = [], results = new Map();
  const monitor = new AvailabilityMonitor({
    now: () => now,
    probe: (id, ip, port) => new Promise(resolve => calls.push({ id, ip, port, resolve })),
    cancel: id => cancelled.push(id),
    publish: (id, result) => result ? results.set(id, result) : results.delete(id),
  });
  return { monitor, calls, cancelled, results, advance: ms => { now += ms; monitor.tick(); } };
}

test('status targets validate and normalize without persisting discovered addresses', () => {
  assert.equal(parseStatusTarget(undefined), undefined);
  assert.deepEqual(parseStatusTarget({ kind: 'manual', ip: '192.168.001.010' }), { kind: 'manual', ip: '192.168.1.10' });
  for (const ip of ['localhost', '127.0.0.1', '255.255.255.255', '224.1.2.3', '0.1.2.3', '999.1.1.1']) assert.throws(() => parseStatusTarget({ kind: 'manual', ip }));
  for (const port of [0, 65536, 2.5, '22', NaN]) assert.throws(() => parseStatusTarget({ ...manual, port }));
  assert.deepEqual(parseStatusTarget({ ...service, ip: '192.168.1.12', port: 22 }), service);
  assert.deepEqual(statusTargetFromDraft(statusTargetDraft(manual)), manual);
  assert.deepEqual(statusTargetFromDraft(statusTargetDraft(service)), service);
  assert.throws(() => statusTargetFromDraft({ mode: 'manual', ip: manual.ip, port: '1e2' }));
  assert.throws(() => statusTargetFromDraft({ mode: 'service', ip: '', port: '' }));
  assert.equal(serviceKey(service), serviceKey({ ...service, serviceType: '_ssh._tcp' }));
});

test('old backups and configured devices round-trip in version 1; invalid imported targets fail', () => {
  const base = { name: 'Office', macAddress: 'AA:BB:CC:DD:EE:FF', broadcastIp: '255.255.255.255' };
  for (const target of [undefined, manual, service]) {
    const original = { ...base, ...(target ? { statusTarget: target } : {}) };
    assert.deepEqual(parseDeviceTransfer(exportDevices([original])), [original]);
  }
  assert.throws(() => parseDeviceTransfer(JSON.stringify({ app: 'POWL', version: 1, devices: [{ ...base, statusTarget: { kind: 'manual', ip: 'bad' } }] })));
});

test('foreground scheduling caps concurrency at four and never overlaps a device', async () => {
  const h = harness();
  h.monitor.setDevices(Array.from({ length: 6 }, (_, i) => device(String(i))));
  assert.equal(h.calls.length, 0);
  h.monitor.setEnvironment(true);
  assert.equal(h.calls.length, 4);
  h.monitor.checkNow('0'); h.advance(1000);
  assert.equal(h.calls.length, 4);
  h.calls[0].resolve({ status: 'online' }); await flush();
  assert.equal(h.calls.length, 5);
  h.calls[1].resolve({ status: 'unreachable' }); await flush();
  assert.equal(h.calls.length, 6);
  h.calls.slice(2).forEach(call => call.resolve({ status: 'online' })); await flush();
  h.advance(29_999); assert.equal(h.calls.length, 6);
  h.advance(1); assert.equal(h.calls.length, 10);
});

test('background and network transitions cancel checks, clear endpoints, and discard old answers', async () => {
  const h = harness();
  h.monitor.setDevices([device('pc', service)]); h.monitor.setEnvironment(true);
  h.monitor.serviceChanged(endpoint); assert.equal(h.calls.length, 1);
  h.monitor.setEnvironment(false); assert.deepEqual(h.cancelled, [h.calls[0].id]);
  h.calls[0].resolve({ status: 'online' }); await flush();
  assert.equal(h.results.get('pc').status, 'unknown');
  h.advance(60_000); assert.equal(h.calls.length, 1);
  h.monitor.setEnvironment(true);
  assert.equal(h.calls.length, 1, 'must rediscover instead of checking a stale IP');
  h.monitor.serviceChanged({ ...endpoint, ip: '192.168.2.20' });
  assert.equal(h.calls[1].ip, '192.168.2.20');
});

test('a large list of slow devices does not starve devices at the end', async () => {
  const h = harness();
  h.monitor.setDevices(Array.from({ length: 48 }, (_, index) => device(String(index), { kind: 'manual', ip: `10.1.0.${index + 1}` })));
  h.monitor.setEnvironment(true);
  for (let wave = 0; wave < 11; wave++) {
    h.advance(3_000);
    h.calls.slice(wave * 4, wave * 4 + 4).forEach(call => call.resolve({ status: 'unreachable' }));
    await flush();
  }
  assert.equal(new Set(h.calls.slice(0, 48).map(call => call.ip)).size, 48);
});

test('device edits and removals invalidate pending results', async () => {
  const h = harness();
  h.monitor.setDevices([device('pc')]); h.monitor.setEnvironment(true);
  h.monitor.setDevices([device('pc', { ...manual, ip: '192.168.1.11' }, 'edited')]);
  h.calls[0].resolve({ status: 'online' }); await flush();
  assert.equal(h.calls[1].ip, '192.168.1.11');
  assert.equal(h.results.get('pc').status, 'unknown');
  h.monitor.setDevices([]); h.calls[1].resolve({ status: 'online' }); await flush();
  assert.equal(h.results.has('pc'), false);
});

test('service duplicates do not recheck, address changes do, lost services become unknown', async () => {
  const h = harness();
  h.monitor.setDevices([device('pc', service)]); h.monitor.setEnvironment(true);
  h.monitor.serviceChanged(endpoint); h.monitor.serviceChanged({ ...endpoint });
  assert.equal(h.calls.length, 1);
  h.calls[0].resolve({ status: 'online' }); await flush();
  h.monitor.serviceChanged({ ...endpoint, ip: '192.168.1.21' });
  assert.equal(h.calls[1].ip, '192.168.1.21');
  h.monitor.serviceChanged(endpoint, true); h.calls[1].resolve({ status: 'online' }); await flush();
  assert.equal(h.results.get('pc').status, 'unknown');
});

test('missing setup, wrong profile, permission and discovery errors remain unknown', async () => {
  const h = harness();
  h.monitor.setDevices([{ id: 'none', revision: 'none' }, { ...device('blocked'), blocker: 'Choose Home.' }, device('service', service), device('manual')]);
  h.monitor.setEnvironment(true, 'Permission denied.');
  assert.equal(h.calls.length, 0);
  assert.match(h.results.get('none').reason, /Set up/);
  assert.equal(h.results.get('blocked').reason, 'Choose Home.');
  h.monitor.setEnvironment(true); assert.equal(h.calls.length, 1);
  h.calls[0].resolve({ status: 'unknown', reason: 'Permission denied.' }); await flush();
  assert.equal(h.results.get('manual').status, 'unknown');
  h.monitor.discoveryFailed('Discovery blocked.');
  assert.equal(h.results.get('service').reason, 'Discovery blocked.');
});

test('wake retries every three seconds, stops on success, and expires after one minute', async () => {
  const h = harness();
  h.monitor.setDevices([device('pc')]); h.monitor.setEnvironment(true);
  h.calls[0].resolve({ status: 'unreachable' }); await flush();
  h.monitor.wakeSent('pc'); assert.equal(h.calls.length, 2);
  h.calls[1].resolve({ status: 'unreachable' }); await flush();
  h.advance(2999); assert.equal(h.calls.length, 2);
  h.advance(1); assert.equal(h.calls.length, 3);
  h.calls[2].resolve({ status: 'online' }); await flush();
  h.advance(3000); assert.equal(h.calls.length, 3);
  h.monitor.wakeSent('pc'); h.calls[3].resolve({ status: 'unreachable' }); await flush();
  h.advance(60_000); h.calls[4].resolve({ status: 'unreachable' }); await flush();
  h.advance(3_000); assert.equal(h.calls.length, 5);
  h.advance(27_000); assert.equal(h.calls.length, 6);
});

test('setup discovery streams and deduplicates results, times out at ten seconds, and ignores late callbacks', () => {
  const started = [], stopped = [];
  let snapshot, timeout, delay, timerCancelled = false;
  const search = new ServiceDiscovery({
    discover: async id => { started.push(id); },
    stopDiscovery: async id => { stopped.push(id); },
  }, state => { snapshot = state; }, (callback, ms) => {
    timeout = callback; delay = ms; return () => { timerCancelled = true; };
  });
  search.start(['_ssh._tcp.']);
  assert.equal(snapshot.searching, true);
  assert.equal(delay, 10_000);
  const event = { sessionId: started[0], kind: 'found', service: endpoint };
  search.receive(event); search.receive(event);
  assert.equal(snapshot.services.length, 1);
  search.receive({ ...event, service: { ...endpoint, ip: '192.168.1.21' } });
  assert.equal(snapshot.services[0].ip, '192.168.1.21');
  timeout();
  assert.equal(snapshot.searching, false);
  assert.equal(timerCancelled, true);
  assert.deepEqual(stopped, [started[0]]);
  search.receive({ ...event, kind: 'lost' });
  assert.equal(snapshot.services.length, 1, 'results remain selectable after timeout');
  search.start(['_ssh._tcp.']);
  assert.equal(snapshot.services.length, 0);
  search.receive(event); assert.equal(snapshot.services.length, 0, 'old sessions must not pollute a retry');
  search.receive({ ...event, sessionId: started[1] });
  search.receive({ ...event, sessionId: started[1], kind: 'lost' });
  assert.equal(snapshot.services.length, 0);
  search.reset('Network changed.');
  assert.equal(snapshot.searching, false);
  assert.equal(snapshot.notice, 'Network changed.');
  assert.deepEqual(stopped, started);
});

test('setup discovery reports native errors and failed starts, releasing its session', async () => {
  let snapshot, id, stopped = 0;
  const search = new ServiceDiscovery({
    discover: async session => { id = session; }, stopDiscovery: async () => { stopped++; },
  }, state => { snapshot = state; });
  search.start(['_ssh._tcp.']);
  search.receive({ sessionId: id, kind: 'error', reason: 'Permission denied.' });
  assert.equal(snapshot.notice, 'Permission denied.');
  assert.equal(snapshot.searching, false); assert.equal(stopped, 1);
  const failed = new ServiceDiscovery({ discover: async () => { throw new Error('failed'); }, stopDiscovery: async () => {} }, state => { snapshot = state; });
  failed.start(['_ssh._tcp.']); await flush();
  assert.equal(snapshot.searching, false);
  assert.match(snapshot.notice, /could not start/);
});
