import type { Availability, DiscoveredService, ProbeResult, StatusTarget } from './availability';

export type MonitoredDevice = { id: string; target?: StatusTarget; blocker?: string; revision: string };
type Options = {
  probe: (id: string, ip: string, port?: number) => Promise<ProbeResult>;
  cancel: (id: string) => void;
  publish: (id: string, result: Availability | undefined) => void;
  now: () => number;
};
type Entry = { device: MonitoredDevice; version: number; due: number; fastUntil: number; result: Availability };

/** Platform-independent scheduler. Its owner supplies lifecycle events and a one-second tick. */
export class AvailabilityMonitor {
  private entries = new Map<string, Entry>();
  private services = new Map<string, DiscoveredService>();
  private running = new Map<string, string>();
  private version = 0;
  private active = false;
  private networkReason: string | undefined = 'Checking local network…';
  private options: Options;
  constructor(options: Options) { this.options = options; }

  private key(service: { name: string; serviceType: string }) {
    return JSON.stringify([service.name, service.serviceType.replace(/\.$/, '')]);
  }

  setDevices(devices: MonitoredDevice[]) {
    const ids = new Set(devices.map(d => d.id));
    for (const [id] of this.entries) {
      if (!ids.has(id)) {
        this.invalidate(id);
        this.entries.delete(id);
        this.options.publish(id, undefined);
      }
    }
    for (const device of devices) {
      const previous = this.entries.get(device.id);
      if (previous?.device.revision === device.revision && previous.device.blocker === device.blocker) continue;
      this.invalidate(device.id);
      const entry: Entry = { device, version: ++this.version, due: 0, fastUntil: 0, result: { status: 'unknown' } };
      this.entries.set(device.id, entry);
      this.unknown(entry);
    }
    this.tick();
  }

  private invalidate(id: string) {
    const request = this.running.get(id);
    if (request) this.options.cancel(request);
    // Keep the slot occupied until cancellation settles, including across network changes.
    const entry = this.entries.get(id);
    if (entry) entry.version = ++this.version;
  }

  setEnvironment(active: boolean, reason?: string) {
    this.active = active;
    this.networkReason = reason;
    this.services.clear();
    for (const [id, entry] of this.entries) {
      this.invalidate(id);
      entry.due = 0;
      entry.fastUntil = 0;
      this.unknown(entry);
    }
    this.tick();
  }

  serviceChanged(service: DiscoveredService, lost = false) {
    const key = this.key(service);
    const previous = this.services.get(key);
    if (lost) this.services.delete(key);
    else this.services.set(key, service);
    if (!lost && previous?.ip === service.ip && previous?.port === service.port) return;
    for (const [id, entry] of this.entries) {
      const target = entry.device.target;
      if (target?.kind !== 'service' || this.key(target) !== key) continue;
      this.invalidate(id);
      entry.due = 0;
      this.unknown(entry);
    }
    this.tick();
  }

  discoveryFailed(reason: string) {
    this.services.clear();
    for (const [id, entry] of this.entries) {
      if (entry.device.target?.kind !== 'service') continue;
      this.invalidate(id);
      entry.result = { status: 'unknown', reason };
      this.options.publish(id, entry.result);
    }
  }

  checkNow(id: string) {
    const entry = this.entries.get(id);
    if (entry) { entry.due = 0; this.tick(); }
  }

  wakeSent(id: string) {
    const entry = this.entries.get(id);
    if (!entry || !this.active) return;
    entry.fastUntil = this.options.now() + 60_000;
    entry.due = 0;
    this.tick();
  }

  private unknown(entry: Entry) {
    const reason = !entry.device.target ? 'Set up status checks to see availability.'
      : entry.device.blocker ?? (!this.active ? 'Checks resume when POWL is open.' : this.networkReason)
        ?? (entry.device.target.kind === 'service' ? 'Waiting for the selected service on this network.' : 'Not checked yet.');
    entry.result = { status: 'unknown', reason };
    this.options.publish(entry.device.id, entry.result);
  }

  tick() {
    if (!this.active || this.networkReason) return;
    // Oldest due first prevents slow checks at the top of a large list starving later devices.
    for (const [id, entry] of [...this.entries].sort(([, a], [, b]) => a.due - b.due)) {
      if (this.running.size >= 4) return;
      if (this.running.has(id) || entry.due > this.options.now() || !entry.device.target || entry.device.blocker) continue;
      const target = entry.device.target;
      const endpoint = target.kind === 'manual' ? target : this.services.get(this.key(target));
      if (!endpoint) continue;
      const version = entry.version;
      const request = `probe-${++this.version}`;
      this.running.set(id, request);
      entry.result = { ...entry.result, checking: true };
      this.options.publish(id, entry.result);
      void this.options.probe(request, endpoint.ip, endpoint.port).catch((): ProbeResult => ({ status: 'unknown', reason: 'The status check failed. Try again.' })).then(result => {
        if (this.entries.get(id) !== entry || entry.version !== version) return;
        entry.result = { ...result, checkedAt: this.options.now(), endpoint: endpoint.ip + (endpoint.port ? `:${endpoint.port}` : '') };
        if (result.status === 'online') entry.fastUntil = 0;
        entry.due = this.options.now() + (entry.fastUntil > this.options.now() ? 3_000 : 30_000);
        this.options.publish(id, entry.result);
      }).finally(() => {
        if (this.running.get(id) === request) this.running.delete(id);
        this.tick();
      });
    }
  }
}
