import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diagnoseWake } from '../lib/wake-diagnosis.ts';

test('diagnosis prioritizes actionable network blockers over old results', () => {
  const base = { configured: true, networkAvailable: true, phase: 'ready' };
  assert.equal(diagnoseWake({ ...base, blocker: 'Choose Home' }), 'Choose Home');
  assert.match(diagnoseWake({ ...base, networkAvailable: false }), /Connect to local/);
  assert.match(diagnoseWake(base), /does not prove/);
});

test('diagnosis distinguishes sending, response failure, and direct observation', () => {
  const base = { configured: true, networkAvailable: true, phase: 'timeout' };
  assert.match(diagnoseWake(base), /service, IP address, and firewall/);
  assert.match(diagnoseWake({ ...base, phase: 'failed' }), /send error does not diagnose/);
  assert.match(diagnoseWake({ ...base, observed: 'awake' }), /You confirmed/);
  assert.match(diagnoseWake({ ...base, observed: 'asleep' }), /MAC address/);
  assert.match(diagnoseWake({ ...base, phase: 'idle', configured: false }), /check the computer directly/);
});
