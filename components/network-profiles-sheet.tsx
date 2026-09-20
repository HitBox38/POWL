import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { useDevicesStore } from '@/store/devices';
import { validateDeviceFields } from '@/lib/device-form';
import { type NetworkProfile } from '@/lib/network-profiles';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };
export function NetworkProfilesSheet(props: Props) {
  return props.open ? <ProfilesContent {...props} /> : null;
}
function ProfilesContent({ open, onOpenChange }: Props) {
  const { profiles, activeProfileId, setActiveProfile, addProfile, updateProfile } = useNetworkProfilesStore();
  const removeProfile = useDevicesStore(state => state.removeNetworkProfile);
  const [editing, setEditing] = useState<NetworkProfile | 'new' | null>(null);
  const [name, setName] = useState('');
  const [broadcastIp, setBroadcastIp] = useState('255.255.255.255');
  const [submitted, setSubmitted] = useState(false);
  const [removing, setRemoving] = useState<NetworkProfile | null>(null);
  const validation = validateDeviceFields({ name, broadcastIp, macAddress: 'AA:BB:CC:DD:EE:FF' }, []);
  const duplicate = profiles.some((profile) => profile.id !== (editing !== 'new' ? editing?.id : undefined) && profile.name.toLowerCase() === name.trim().toLowerCase());
  const nameError = submitted ? validation.name ?? (duplicate ? 'A profile with this name already exists.' : undefined) : undefined;
  const beginEdit = (profile: NetworkProfile | 'new') => {
    setEditing(profile);
    setName(profile === 'new' ? '' : profile.name);
    setBroadcastIp(profile === 'new' ? '255.255.255.255' : profile.broadcastIp);
    setSubmitted(false);
  };
  const save = () => {
    setSubmitted(true);
    if (!editing || validation.name || validation.broadcastIp || duplicate) return;
    const fields = { name: name.trim(), broadcastIp: broadcastIp.trim().split('.').map(Number).join('.') };
    if (editing === 'new') addProfile(fields); else updateProfile(editing.id, fields);
    setEditing(null);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-2xl">        <View>
          <DialogHeader className="mb-4">
            <DialogTitle>{removing ? 'Remove network profile?' : editing ? editing === 'new' ? 'Add Network Profile' : 'Edit Network Profile' : 'Network Profiles'}</DialogTitle>
            <DialogDescription>Choose your current network manually. POWL cannot detect or change your Wi-Fi connection.</DialogDescription>
          </DialogHeader>
          {removing ? <View className="gap-3">
            <Text className="text-foreground">Remove {removing.name}? Linked devices will keep its broadcast address as their own setting.</Text>
            <Button variant="destructive" onPress={() => { removeProfile(removing.id); setRemoving(null); }}><Text>Remove Profile</Text></Button>
            <Button variant="outline" onPress={() => setRemoving(null)}><Text>Keep Profile</Text></Button>
          </View> : editing ? <View className="gap-3">
            <Text className="text-foreground">Profile name</Text>
            <Input accessibilityLabel="Profile name" placeholder="e.g. Home or Office" value={name} onChangeText={setName} autoCorrect={false} aria-invalid={!!nameError} />
            {nameError ? <Text accessibilityLiveRegion="polite" className="text-destructive text-sm">{nameError}</Text> : null}
            <Text className="text-foreground">Broadcast IP</Text>
            <Input accessibilityLabel="Profile broadcast IP" value={broadcastIp} onChangeText={setBroadcastIp} autoCorrect={false} autoCapitalize="none" keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} aria-invalid={submitted && !!validation.broadcastIp} />
            {submitted && validation.broadcastIp ? <Text accessibilityLiveRegion="polite" className="text-destructive text-sm">{validation.broadcastIp}</Text> : null}
            <Text className="text-sm text-muted-foreground">This address is used by every linked device. A subnet broadcast address depends on your network’s subnet mask; ask your network administrator if unsure.</Text>
            <Button onPress={save}><Text>Save Profile</Text></Button>
            <Button variant="outline" onPress={() => setEditing(null)}><Text>Cancel</Text></Button>
          </View> : <View className="gap-3">
            <Button variant={activeProfileId === null ? 'default' : 'outline'} accessibilityState={{ selected: activeProfileId === null }} onPress={() => setActiveProfile(null)}><Text>No network selected</Text></Button>
            {profiles.length === 0 ? <Text className="text-sm text-muted-foreground">Create a Home or Office profile to share broadcast settings across devices. Link it from a device’s Advanced settings.</Text> : null}
            {profiles.map((profile) => <View key={profile.id} className="border border-border rounded-xl p-3 gap-2">
              <Button variant={activeProfileId === profile.id ? 'default' : 'outline'} accessibilityLabel={`Use ${profile.name} as current network`} accessibilityState={{ selected: activeProfileId === profile.id }} onPress={() => setActiveProfile(profile.id)}><Text>{activeProfileId === profile.id ? 'Selected: ' : 'Select: '}{profile.name}</Text></Button>
              <Text className="text-sm text-muted-foreground font-mono">{profile.broadcastIp}</Text>
              <View className="flex-row gap-2"><Button variant="ghost" className="flex-1" accessibilityLabel={`Edit ${profile.name}`} onPress={() => beginEdit(profile)}><Text>Edit</Text></Button><Button variant="ghost" className="flex-1" accessibilityLabel={`Remove ${profile.name}`} onPress={() => setRemoving(profile)}><Text>Remove</Text></Button></View>
            </View>)}
            <Button onPress={() => beginEdit('new')}><Text>Add Network Profile</Text></Button>
            <Button variant="ghost" onPress={() => onOpenChange(false)}><Text>Done</Text></Button>
          </View>}
        </View>      </DialogContent>
    </Dialog>
  );
}
