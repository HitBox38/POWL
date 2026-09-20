import { useState } from 'react';
import { View } from 'react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { DeviceEditorSheet } from '@/components/add-device-sheet';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { resolveBroadcastIp } from '@/lib/network-profiles';
import { useDevicesStore, type Device } from '@/store/devices';
import { TroubleshootSheet } from '@/components/troubleshoot-sheet';
import { WakeHistorySheet } from '@/components/wake-history-sheet';
import { DeviceOrganizationSheet } from '@/components/device-organization-sheet';

type Props = { device: Device; open: boolean; onOpenChange: (open: boolean) => void };
export function DeviceDetailsSheet(props: Props) {
  return props.open ? <DeviceDetails {...props} /> : null;
}
function DeviceDetails({ device, open, onOpenChange }: Props) {
  const profiles = useNetworkProfilesStore((state) => state.profiles);
  const profile = profiles.find((item) => item.id === device.networkProfileId);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [section, setSection] = useState<'history' | 'troubleshoot' | 'organize' | null>(null);
  if (editing) return <DeviceEditorSheet device={device} open onOpenChange={() => setEditing(false)} />;
  if (section === 'history') return <WakeHistorySheet device={device} open onOpenChange={() => setSection(null)} />;
  if (section === 'troubleshoot') return <TroubleshootSheet device={device} open onOpenChange={() => setSection(null)} onRetry={() => { void useDevicesStore.getState().wakeDevice(device.id); }} />;
  if (section === 'organize') return <DeviceOrganizationSheet device={device} open onOpenChange={() => setSection(null)} />;
  const sending = device.wakeStatus === 'sending';
  const remove = () => {
    if (useDevicesStore.getState().devices.find((item) => item.id === device.id)?.wakeStatus === 'sending') return;
    onOpenChange(false);
    useDevicesStore.getState().removeDevice(device.id);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-2xl">
        <View>
          <DialogHeader className="mb-5">
            <DialogTitle>{confirmRemove ? 'Remove device?' : device.name}</DialogTitle>
            <DialogDescription>{confirmRemove ? `Remove ${device.name} from POWL? You can add it again later.` : 'Saved network settings for this device.'}</DialogDescription>
          </DialogHeader>
          {confirmRemove ? (
            <View className="gap-3">
              <Text className="text-muted-foreground">This only removes the saved configuration. It does not change or shut down your computer.</Text>
              <Button variant="destructive" disabled={sending} onPress={remove}><Text>Remove Device</Text></Button>
              <Button variant="outline" onPress={() => setConfirmRemove(false)}><Text>Keep Device</Text></Button>
            </View>
          ) : (
            <View className="gap-4">
              <View><Text className="text-sm text-muted-foreground">MAC address</Text><Text selectable className="font-mono text-foreground">{device.macAddress}</Text></View>
              <View><Text className="text-sm text-muted-foreground">Broadcast IP</Text><Text selectable className="font-mono text-foreground">{resolveBroadcastIp(device, profiles)}</Text></View>
              {profile ? <Text className="text-sm text-muted-foreground">Network profile: {profile.name}</Text> : null}
              <Text className="text-sm text-muted-foreground">To test these settings, close this panel and tap Wake on the device card.</Text>
              {sending ? <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">Wait for the current wake request before changing this device.</Text> : null}
              <Button disabled={sending} onPress={() => setEditing(true)}><Text>Edit Device</Text></Button>
              <Button variant="outline" onPress={() => setSection('history')}><Text>Wake history</Text></Button>
              <Button variant="outline" onPress={() => setSection('troubleshoot')}><Text>Troubleshoot wake</Text></Button>
              <Button variant="outline" onPress={() => setSection('organize')}><Text>Organize device</Text></Button>
              <Button variant="outline" disabled={sending} onPress={() => setConfirmRemove(true)}><Text>Remove Device</Text></Button>
              <Button variant="ghost" onPress={() => onOpenChange(false)}><Text>Done</Text></Button>
            </View>
          )}
        </View>
      </DialogContent>
    </Dialog>
  );
}
