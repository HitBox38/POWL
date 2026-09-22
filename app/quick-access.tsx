import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Screen, Section } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useDevicesStore } from '@/store/devices';
import { useQuickActionsStore } from '@/store/quick-actions';
import { quickActionsUnavailableReason, requestAddWakeTile } from '@/modules/wol-sender/quick-actions';

export default function QuickAccessScreen() {
  const devices = useDevicesStore(state => state.devices);
  const selectedId = useQuickActionsStore(state => state.selectedDeviceId);
  const syncError = useQuickActionsStore(state => state.syncError);
  const selected = devices.find(device => device.id === selectedId);
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const unavailable = quickActionsUnavailableReason();
  return <Screen title="Quick access" subtitle="Wake a computer from Android’s pull-down panel or your launcher.">
    {unavailable ? <Text>{unavailable}</Text> : <>
      <Section title="Quick Settings tile">
        <Text className="text-muted-foreground leading-6">Choose the computer for the POWL Wake tile. Tap the tile to send a wake request; unlock your phone first if prompted.</Text>
        <View accessibilityRole="radiogroup" className="gap-2">
          {[{ id: null, name: 'No device' }, ...devices].map(device => <Pressable key={device.id ?? 'none'} accessibilityRole="radio"
            accessibilityState={{ checked: device.id === (selected?.id ?? null) }} accessibilityLabel={device.name}
            className={`min-h-12 justify-center rounded-md border p-3 ${device.id === (selected?.id ?? null) ? 'border-primary bg-primary/10' : 'border-border'}`}
            onPress={() => { useQuickActionsStore.getState().selectDevice(device.id); setMessage(''); }}><Text>{device.name}{device.id === (selected?.id ?? null) ? ' ✓' : ''}</Text></Pressable>)}
        </View>
        <Button disabled={!selected || adding || !!syncError} onPress={async () => {
          setAdding(true);
          try {
            const requested = await requestAddWakeTile();
            setMessage(requested ? 'POWL Wake is in your Quick Settings tiles.' : 'Pull down Quick Settings, tap Edit, and drag POWL Wake into your active tiles.');
          } catch { setMessage('Pull down Quick Settings, tap Edit, and add POWL Wake manually.'); }
          finally { setAdding(false); }
        }}><Text>{adding ? 'Opening Android…' : 'Add Quick Settings tile'}</Text></Button>
      </Section>
      <Section title="Launcher shortcuts">
        <Text className="leading-6">Favorite a device on its details page, then long-press the POWL app icon to wake it. POWL publishes up to four favorites, in device-list order; your launcher may show fewer. Supported launchers also let you drag a shortcut onto the home screen.</Text>
        <Text className="text-sm text-muted-foreground">{devices.filter(device => device.isFavorite).length} favorite devices. Removing a favorite disables its pinned wake shortcut.</Text>
      </Section>
      <Text className="text-sm text-muted-foreground leading-6">Quick actions use the latest saved destination and selected network profile. Connect to the computer’s local network first. Results appear in Android, separately from app wake history. “Packet sent” does not confirm that the computer woke.</Text>
    </>}
    {syncError ? <Text accessibilityLiveRegion="polite" className="text-destructive">{syncError}</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
  </Screen>;
}
