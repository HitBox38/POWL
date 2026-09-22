import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Section } from '@/components/screen';
import { SetupWalkthrough } from '@/components/setup-walkthrough';
import { DeviceAvailability } from '@/components/device-availability';
import { WakeButton, useWakeBlocker } from '@/components/wake-button';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useWakeSession } from '@/hooks/use-wake-session';
import { useAvailabilityStore } from '@/store/availability';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { resolveBroadcastIp } from '@/lib/network-profiles';
import { diagnoseWake } from '@/lib/wake-diagnosis';
import type { Device } from '@/store/devices';

export function TroubleshootSheet({ device }: { device: Device }) {
  const [guide, setGuide] = useState(true);
  const [prepared, setPrepared] = useState(false);
  const [observed, setObserved] = useState<'awake' | 'asleep'>();
  const [showDetails, setShowDetails] = useState(false);
  const session = useWakeSession(device);
  const blocker = useWakeBlocker(device);
  const network = useAvailabilityStore(state => state.network);
  const profiles = useNetworkProfilesStore(state => state.profiles);
  return <Screen title="Guided diagnosis" subtitle={device.name}>
    {guide ? <>
      <SetupWalkthrough onComplete={() => setGuide(false)} />
      <Button variant="ghost" onPress={() => setGuide(false)}><Text>Already set up? Go to diagnosis</Text></Button>
    </> : <>
      <Section title="1 · Check this phone’s connection">
        <Text>{network.available ? 'Local network access is available.' : network.reason ?? 'Local network access is unavailable.'}</Text>
        <Text className="text-sm text-muted-foreground">This does not verify that your computer is on the same subnet. Network profiles are selected manually.</Text>
        {blocker ? <Text className="text-destructive">{blocker}</Text> : null}
        <Button variant="outline" disabled={session.busy} onPress={() => router.push('/networks')}><Text>Review network profile</Text></Button>
      </Section>
      <Section title="2 · Check the computer while awake">
        <DeviceAvailability device={device} details />
      </Section>
      <Section title="3 · Put it to sleep and test">
        <Text className="leading-6">Leave the computer powered and connected. Put it to sleep yourself, then confirm below. POWL cannot put it to sleep.</Text>
        <Button variant={prepared ? 'default' : 'outline'} disabled={session.busy} accessibilityRole="checkbox" accessibilityState={{ checked: prepared }}
          onPress={() => { setPrepared(value => !value); setObserved(undefined); }}><Text>{prepared ? '✓ Computer is ready for the test' : 'I’ve put the computer to sleep'}</Text></Button>
        {device.statusTarget ? <Button disabled={!prepared || !!blocker || !network.available || session.busy || device.wakeStatus === 'sending'}
          onPress={() => { setObserved(undefined); void session.start(); }}><Text>{session.busy ? 'Testing…' : 'Run wake test'}</Text></Button>
          : prepared ? <WakeButton device={device} test /> : null}
        {session.message ? <Text accessibilityLiveRegion="polite" className="leading-6">{session.message}</Text> : null}
        {session.busy ? <Button variant="ghost" onPress={session.cancel}><Text>Cancel test</Text></Button> : null}
        {!device.statusTarget && device.lastWakeRequest ? <Text accessibilityLiveRegion="polite">{device.lastWakeRequest.result === 'sent' ? 'Last request: packet sent. Check the computer directly.' : `Last request failed: ${device.lastWakeRequest.error ?? 'Try again.'}`}</Text> : null}
        {prepared && !session.busy ? <View className="gap-2">
          <Text>What do you see on the computer?</Text>
          <Button variant="outline" onPress={() => setObserved('awake')}><Text>It woke up</Text></Button>
          <Button variant="outline" onPress={() => setObserved('asleep')}><Text>It stayed asleep</Text></Button>
        </View> : null}
      </Section>
      <Section title="What to do next">
        <Text accessibilityLiveRegion="polite" className="leading-6">{diagnoseWake({ blocker, networkAvailable: network.available, configured: !!device.statusTarget, phase: session.phase, observed })}</Text>
        <Button variant="outline" disabled={session.busy} onPress={() => router.push({ pathname: '/device/[id]/edit', params: { id: device.id } })}><Text>Review saved device</Text></Button>
        <Button variant="ghost" disabled={session.busy} onPress={() => { setGuide(true); setPrepared(false); setObserved(undefined); }}><Text>Review setup walkthrough</Text></Button>
      </Section>
    </>}
    <Button variant="ghost" accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails(value => !value)}><Text>{showDetails ? 'Hide' : 'Show'} technical details</Text></Button>
    {showDetails ? <View className="rounded-lg bg-secondary p-3 gap-2">
      <Text selectable className="text-sm font-mono">Saved MAC: {device.macAddress}</Text>
      <Text selectable className="text-sm font-mono">Effective broadcast: {resolveBroadcastIp(device, profiles)}:9 (UDP)</Text>
      {device.lastWakeRequest ? <>
        <Text selectable className="text-sm">Last attempt: {new Date(device.lastWakeRequest.requestedAt).toLocaleString()}</Text>
        <Text selectable className="text-sm font-mono">Attempt destination: {device.lastWakeRequest.macAddress} via {device.lastWakeRequest.broadcastIp}:9</Text>
        <Text selectable className="text-sm">{device.lastWakeRequest.error ?? 'Packet sent. Delivery and wake are not confirmed.'}</Text>
      </> : <Text className="text-sm">No send attempt recorded.</Text>}
    </View> : null}
  </Screen>;
}
