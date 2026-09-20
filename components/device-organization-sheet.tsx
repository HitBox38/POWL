import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDevicesStore, type Device, type DeviceGroup } from '@/store/devices';

function GroupEditor({ group }: { group: DeviceGroup }) {
  const [name, setName] = useState(group.name);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState('');
  const renameGroup = useDevicesStore((state) => state.renameGroup);
  const removeGroup = useDevicesStore((state) => state.removeGroup);
  return (
    <View className="gap-2 bg-secondary p-3 rounded-lg">
      <Input accessibilityLabel={`Name of group ${group.name}`} value={name} maxLength={40} onChangeText={(value) => { setName(value); setError(''); }} />
      {error ? <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">{error}</Text> : null}
      {confirmRemove ? (
        <>
          <Text className="text-sm">Remove {group.name}? Its devices will remain saved without a group.</Text>
          <View className="flex-row flex-wrap gap-2">
            <Button variant="outline" className="min-h-12" onPress={() => setConfirmRemove(false)}><Text>Keep group</Text></Button>
            <Button variant="destructive" className="min-h-12" onPress={() => removeGroup(group.id)}><Text>Remove group</Text></Button>
          </View>
        </>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          <Button variant="outline" className="min-h-12" onPress={() => {
            if (!renameGroup(group.id, name)) setError('Use a unique group name, up to 40 characters.');
          }}><Text>Save name</Text></Button>
          <Button variant="ghost" className="min-h-12" onPress={() => setConfirmRemove(true)}><Text>Remove group</Text></Button>
        </View>
      )}
    </View>
  );
}

type DeviceOrganizationSheetProps = { device?: Device; open: boolean; onOpenChange: (open: boolean) => void };

export function DeviceOrganizationSheet({ device, open, onOpenChange }: DeviceOrganizationSheetProps) {
  const groups = useDevicesStore((state) => state.groups);
  const assignGroup = useDevicesStore((state) => state.assignGroup);
  const addGroup = useDevicesStore((state) => state.addGroup);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-2xl max-h-[85%]">
        <DialogHeader className="pr-6">
          <DialogTitle>{device ? 'Organize device' : 'Manage groups'}</DialogTitle>
          <DialogDescription>{device?.name ?? 'Group computers you usually wake together.'}</DialogDescription>
        </DialogHeader>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="gap-4">
            {device ? (
              <View className="gap-2">
                <Text className="font-semibold">Device group</Text>
                <View className="flex-row flex-wrap gap-2">
                  <Button accessibilityState={{ selected: !device.groupId }} variant={!device.groupId ? 'default' : 'outline'} className="min-h-12" onPress={() => assignGroup(device.id)}><Text>No group</Text></Button>
                  {groups.map((group) => <Button key={group.id} accessibilityState={{ selected: device.groupId === group.id }} variant={device.groupId === group.id ? 'default' : 'outline'} className="min-h-12" onPress={() => assignGroup(device.id, group.id)}><Text>{group.name}</Text></Button>)}
                </View>
                <Text className="text-xs text-muted-foreground">Group selection is saved immediately.</Text>
              </View>
            ) : null}
            <View className="gap-2">
              <Text className="font-semibold">New group</Text>
              <Input accessibilityLabel="New group name" placeholder="e.g. Studio" maxLength={40} value={name} onChangeText={(value) => { setName(value); setError(''); }} />
              {error ? <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">{error}</Text> : null}
              <Button className="min-h-12" onPress={() => {
                if (addGroup(name)) { setName(''); setError(''); }
                else setError('Use a unique group name, up to 40 characters.');
              }}><Text>Create group</Text></Button>
            </View>
            {groups.length ? <Text className="font-semibold">Manage groups</Text> : null}
            {groups.map((group) => <GroupEditor key={group.id} group={group} />)}
          </View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}
