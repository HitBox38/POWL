import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Section, MissingRecord } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouteDevice } from '@/hooks/use-route-device';
import { useWakeSession } from '@/hooks/use-wake-session';
import { useWakeBlocker } from '@/components/wake-button';
import { parseConnectionUrl } from '@/lib/connection';
import { useDevicesStore, type Device } from '@/store/devices';

export default function ConnectScreen() {
  const device = useRouteDevice();
  return device ? <Connect key={device.id} device={device} /> : <MissingRecord />;
}

function Connect({ device }: { device: Device }) {
  const [url, setUrl] = useState(device.connectionUrl ?? '');
  const [message, setMessage] = useState('');
  const [opening, setOpening] = useState(false);
  const session = useWakeSession(device);
  const blocker = useWakeBlocker(device);
  const changed = url.trim() !== (device.connectionUrl ?? '');
  return <Screen title="Wake → connect" subtitle={device.name}>
    <Section title="Where to connect">
      <Text className="text-muted-foreground leading-6">Save a dashboard URL or a link supported by your remote desktop or streaming app. POWL will offer to open it after the configured status check responds.</Text>
      <Input accessibilityLabel="Connection URL or app link" value={url} onChangeText={value => { setUrl(value); setMessage(''); }}
        placeholder="https://192.168.1.10:8006" autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!session.busy} />
      <Text className="text-sm text-muted-foreground">App links require a compatible installed app. Use its documented link format. Avoid putting passwords in links.</Text>
      <Button variant="outline" disabled={!changed || session.busy} onPress={() => {
        try {
          const connectionUrl = parseConnectionUrl(url);
          useDevicesStore.getState().updateDevice(device.id, { connectionUrl });
          setUrl(connectionUrl ?? '');
          setMessage(connectionUrl ? 'Connection saved.' : 'Connection removed.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Check the link.'); }
      }}><Text>Save connection</Text></Button>
    </Section>
    {!device.statusTarget ? <View className="gap-3">
      <Text>Set up a status check for this computer while it is awake. For best results, check the service you want to connect to.</Text>
      <Button variant="outline" onPress={() => router.push({ pathname: '/device/[id]/edit', params: { id: device.id } })}><Text>Set up status checks</Text></Button>
    </View> : null}
    {blocker ? <Text className="text-muted-foreground">{blocker}</Text> : null}
    <Button disabled={!device.connectionUrl || !device.statusTarget || !!blocker || session.busy || changed || device.wakeStatus === 'sending'} onPress={session.start}>
      <Text>{session.busy ? 'Waiting for computer…' : 'Wake and wait'}</Text>
    </Button>
    {session.message ? <Text accessibilityLiveRegion="polite" className="leading-6">{session.message}</Text> : null}
    {session.busy ? <Button variant="ghost" onPress={session.cancel}><Text>Cancel wait</Text></Button> : null}
    {session.phase === 'ready' && device.connectionUrl && !changed ? <>
      <Text selectable className="text-sm text-muted-foreground">Open: {device.connectionUrl}</Text>
      <Button disabled={opening} onPress={async () => {
        setOpening(true);
        try {
          const destination = parseConnectionUrl(device.connectionUrl);
          if (!destination) return;
          await Linking.openURL(destination);
          setMessage('Connection opened.');
        } catch { setMessage('Could not open this link. Install a compatible app or check the saved URL.'); }
        finally { setOpening(false); }
      }}><Text>{opening ? 'Opening…' : 'Open connection'}</Text></Button>
    </> : null}
    {session.phase === 'timeout' || session.phase === 'failed' ? <Button variant="outline" onPress={() => router.push({ pathname: '/device/[id]/troubleshoot', params: { id: device.id } })}><Text>Troubleshoot wake</Text></Button> : null}
    {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
    <Text className="text-sm text-muted-foreground">Keep POWL open while waiting. Leaving this screen or changing networks cancels the wait. A response confirms reachability, not that a particular app has finished starting.</Text>
  </Screen>;
}
