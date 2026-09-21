import { serviceKey, type DiscoveredService, type DiscoveryEvent } from './availability.ts';

export type DiscoverySnapshot = { searching: boolean; services: DiscoveredService[]; notice: string };
type Adapter = {
  discover: (id: string, types: string[]) => Promise<void>;
  stopDiscovery: (id: string) => Promise<void>;
};

/** Owns the bounded setup search; ignores callbacks from timed-out or replaced searches. */
export class ServiceDiscovery {
  private adapter: Adapter;
  private publish: (state: DiscoverySnapshot) => void;
  private schedule: (callback: () => void, ms: number) => () => void;
  private cancelTimer?: () => void;
  private session?: string;
  private sequence = 0;
  private state: DiscoverySnapshot = { searching: false, services: [], notice: '' };
  constructor(adapter: Adapter, publish: (state: DiscoverySnapshot) => void,
    schedule = (callback: () => void, ms: number) => { const timer = setTimeout(callback, ms); return () => clearTimeout(timer); }) {
    this.adapter = adapter; this.publish = publish; this.schedule = schedule;
  }
  private update(change: Partial<DiscoverySnapshot>) {
    this.state = { ...this.state, ...change };
    this.publish(this.state);
  }
  stop() {
    this.cancelTimer?.(); this.cancelTimer = undefined;
    if (this.session) void this.adapter.stopDiscovery(this.session).catch(() => {});
    this.session = undefined;
    this.update({ searching: false });
  }
  reset(notice = '') { this.stop(); this.update({ services: [], notice }); }
  start(types: string[]) {
    this.stop();
    const id = `setup-${Date.now()}-${++this.sequence}`;
    this.session = id;
    this.update({ searching: true, services: [], notice: 'Keep your computer awake during setup. Select its advertised service below.' });
    this.cancelTimer = this.schedule(() => {
      if (this.session !== id) return;
      this.stop();
      this.update({ notice: 'Search finished. Select a result, retry, or enter an IP manually if your computer is missing.' });
    }, 10_000);
    void this.adapter.discover(id, types).catch(() => {
      if (this.session !== id) return;
      this.stop(); this.update({ notice: 'Discovery could not start. Retry or enter an IP manually.' });
    });
  }
  receive(event: DiscoveryEvent) {
    if (event.sessionId !== this.session) return;
    if (event.kind === 'error') {
      this.stop(); this.update({ notice: event.reason ?? 'Discovery failed. Retry or enter an IP manually.' });
    } else if (event.service) {
      const service = event.service;
      const others = this.state.services.filter(item => serviceKey(item) !== serviceKey(service));
      this.update({ services: event.kind === 'lost' ? others : [...others, service].sort((a, b) => a.name.localeCompare(b.name)) });
    }
  }
}
