import type { Availability } from './availability';

export type WakeSessionState = {
  phase: 'idle' | 'sending' | 'waiting' | 'ready' | 'timeout' | 'failed' | 'cancelled';
  message: string;
};

/** A previous green status must never complete a new wake workflow. */
export function wakeWaitResult(result: Availability | undefined, since: number, now: number): WakeSessionState | undefined {
  if (result?.status === 'online' && !result.checking && (result.checkedAt ?? 0) > since) {
    return { phase: 'ready', message: 'The configured address or service responded. You can connect now.' };
  }
  if (now - since >= 60_000) return {
    phase: 'timeout', message: 'No response within one minute. The computer may still be starting, or its service or firewall may be blocking checks.',
  };
  return undefined;
}
