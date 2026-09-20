import { useState } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { DeviceCard } from '@/components/device-card';
import { AddDeviceSheet } from '@/components/add-device-sheet';
import { useDevicesStore } from '@/store/devices';

export default function HomeScreen() {
  const { devices } = useDevicesStore();
  const [addSheetOpen, setAddSheetOpen] = useState(false);

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
