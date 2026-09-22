import type { WakeSessionState } from './wake-session';

export function diagnoseWake({ blocker, networkAvailable, configured, phase, observed }: {
  blocker?: string | null;
  networkAvailable: boolean;
  configured: boolean;
  phase: WakeSessionState['phase'];
  observed?: 'awake' | 'asleep';
}): string {
  if (blocker) return blocker;
  if (!networkAvailable) return 'Connect to local Wi-Fi or Ethernet, then check again. POWL cannot verify the computer on the current connection.';
  if (observed === 'awake') return 'You confirmed the computer woke. If status still does not respond, check the saved IP, the selected service, and the computer’s firewall.';
  if (observed === 'asleep') return 'Recheck the connected adapter’s MAC address and magic-packet wake settings. Then verify the broadcast address and router isolation. Test from sleep before trying shutdown.';
  if (phase === 'ready') return 'The configured endpoint responded after the request. Check the computer directly to confirm it woke; a response alone does not prove a sleep-to-wake transition.';
  if (phase === 'failed') return 'The wake test could not complete. Read the error above, check your network selection, and retry. A send error does not diagnose the computer’s power settings.';
  if (phase === 'timeout') return 'No fresh response arrived within one minute. If the computer is awake, check the service, IP address, and firewall. If it stayed asleep, revisit the adapter and firmware wake settings.';
  if (!configured) return 'Add a status check while the computer is awake for an automatic test, or send a test request and check the computer directly.';
  return 'Verify the status check while the computer is awake, then put it to sleep and run the test. POWL can check network responses and packet sending, but cannot inspect firmware or power settings.';
}
