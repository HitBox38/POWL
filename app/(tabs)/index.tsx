import { useState } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { DeviceCard } from '@/components/device-card';
import { DeviceDataGate } from '@/components/device-data-gate';
import { NetworkProfilesSheet } from '@/components/network-profiles-sheet';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { AddDeviceSheet } from '@/components/add-device-sheet';
import { useDevicesStore } from '@/store/devices';
import { AppearanceSettings } from '@/components/appearance-settings';
import { DeviceTransferSheet } from '@/components/device-transfer-sheet';

export default function HomeScreen() {
  return <DeviceDataGate><HomeContent /></DeviceDataGate>;
}

function HomeContent() {
  const devices = useDevicesStore((state) => state.devices);

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const { profiles, activeProfileId } = useNetworkProfilesStore();
  const currentProfile = profiles.find((profile) => profile.id === activeProfileId);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-6 pb-4 flex-row items-center justify-between border-b border-border">
        <View>
          <Text className="text-2xl font-bold text-foreground tracking-tight">POWL</Text>
          <Text className="text-sm text-muted-foreground mt-0.5">
            Wake-on-LAN
          </Text>
        </View>
        <Button
          size="sm"
          onPress={() => setAddSheetOpen(true)}
          className="bg-primary"
        >
          <Text className="text-primary-foreground font-semibold text-sm">+ Add Device</Text>
        </Button>
      </View>

      <View className="px-4 pt-3 flex-row flex-wrap justify-end gap-2">
        <AppearanceSettings />
        <Button variant="outline" onPress={() => setTransferOpen(true)}><Text>Transfer devices</Text></Button>
      </View>
      <DeviceTransferSheet open={transferOpen} onOpenChange={setTransferOpen} />

      <View className="px-4 py-2 border-b border-border">
        <Button variant="ghost" onPress={() => setProfilesOpen(true)} accessibilityLabel="Manage network profiles">
          <Text>Networks · {currentProfile?.name ?? 'Choose current network'}</Text>
        </Button>
      </View>
      <NetworkProfilesSheet open={profilesOpen} onOpenChange={setProfilesOpen} />
      {/* Device list */}
      {devices.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Text className="text-xl font-semibold text-foreground text-center">
            Wake your computer from your phone
          </Text>
          <Text className="text-muted-foreground text-center text-sm leading-relaxed">
            Connect to the same local network and add your computer’s MAC address. We’ll help you set it up and test your first wake.
          </Text>
          <Button
            onPress={() => setAddSheetOpen(true)}
            className="mt-2 bg-primary"
          >
            <Text className="text-primary-foreground font-semibold">Add Your First Device</Text>
          </Button>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DeviceCard device={item} />}
          contentContainerClassName="px-4 pt-4 pb-8"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Device Dialog */}
      <AddDeviceSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
      />
    </SafeAreaView>
  );
}


