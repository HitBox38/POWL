export const SERVICE_TYPES = ['_smb._tcp.', '_ssh._tcp.', '_rfb._tcp.', '_http._tcp.'] as const;
export type StatusTarget =
  | { kind: 'manual'; ip: string; port?: number }
  | { kind: 'service'; name: string; serviceType: string };
export type DiscoveredService = { name: string; serviceType: string; ip: string; port: number };
export type Availability = {
  status: 'online' | 'unreachable' | 'unknown';
  checking?: boolean;
  checkedAt?: number;
  reason?: string;
  endpoint?: string;
};
export type ProbeResult = { status: Availability['status']; reason?: string };
export type DiscoveryEvent = {
  sessionId: string;
  kind: 'found' | 'lost' | 'error';
  service?: DiscoveredService;
  reason?: string;
};
export type NetworkState = { key: string; available: boolean; reason?: string };
export type StatusTargetDraft = { mode: 'none' | 'manual' | 'service'; ip: string; port: string; service?: StatusTarget & { kind: 'service' } };
export function statusTargetDraft(target?: StatusTarget): StatusTargetDraft {
  return { mode: target?.kind ?? 'none', ip: target?.kind === 'manual' ? target.ip : '', port: target?.kind === 'manual' && target.port ? String(target.port) : '', service: target?.kind === 'service' ? target : undefined };
}
export function statusTargetFromDraft(draft: StatusTargetDraft): StatusTarget | undefined {
  if (draft.mode === 'none') return undefined;
  if (draft.mode === 'service') {
    if (!draft.service) throw new Error('Select a computer, enter its IP manually, or remove status checks.');
    return parseStatusTarget(draft.service);
  }
  if (draft.port.trim() && !/^\d+$/.test(draft.port.trim())) throw new Error('Enter a port between 1 and 65535, or leave it empty.');
  return parseStatusTarget({ kind: 'manual', ip: draft.ip, ...(draft.port.trim() ? { port: Number(draft.port) } : {}) });
}

export function serviceKey(service: { name: string; serviceType: string }): string {
  return JSON.stringify([service.name, service.serviceType.replace(/\.$/, '')]);
}

export function parseStatusTarget(value: unknown): StatusTarget | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object') throw new Error('Invalid status check settings.');
  const target = value as Record<string, unknown>;
  if (target.kind === 'manual' && typeof target.ip === 'string') {
    const parts = target.ip.trim().split('.');
    if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) {
      throw new Error('Enter a valid computer IPv4 address.');
    }
    const octets = parts.map(Number);
    if (octets[0] === 0 || octets[0] === 127 || octets[0] >= 224 || octets.every(n => n === 255)) {
      throw new Error('Enter your computer’s local IP, not a loopback or broadcast address.');
    }
    if (target.port !== undefined && (typeof target.port !== 'number' || !Number.isInteger(target.port) || target.port < 1 || target.port > 65535)) {
      throw new Error('Enter a port between 1 and 65535, or leave it empty.');
    }
    return { kind: 'manual', ip: octets.join('.'), ...(target.port === undefined ? {} : { port: target.port as number }) };
  }
  if (target.kind === 'service' && typeof target.name === 'string' && target.name.trim() && target.name.length <= 255 && typeof target.serviceType === 'string') {
    const serviceType = target.serviceType.replace(/\.$/, '') + '.';
    if (SERVICE_TYPES.some(type => type === serviceType)) return { kind: 'service', name: target.name, serviceType };
  }
  throw new Error('Invalid status check settings.');
}

export function targetLabel(target?: StatusTarget): string {
  if (!target) return 'Status checks are not configured.';
  return target.kind === 'manual'
    ? target.ip + (target.port ? `:${target.port}` : ' · reachability')
    : `${target.name} · ${serviceLabel(target.serviceType)}`;
}

export function serviceLabel(type: string): string {
  return ({ '_smb._tcp': 'File sharing', '_ssh._tcp': 'SSH', '_rfb._tcp': 'VNC', '_http._tcp': 'HTTP' } as Record<string, string>)[type.replace(/\.$/, '')] ?? type;
}
