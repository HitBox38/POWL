import { type PropsWithChildren, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useDeviceDataReady, reloadDeviceData } from '@/lib/device-data';

export function DeviceDataGate({ children }: PropsWithChildren) {
  const ready = useDeviceDataReady();
  const [retrying, setRetrying] = useState(false);
  const [retried, setRetried] = useState(false);
  if (ready) return children;
  return <SafeAreaView className="flex-1 bg-background">
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Text className="text-xl font-semibold text-foreground">Loading your devices</Text>
      <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground text-center">
        {retried && !retrying ? 'Saved data is still unavailable. Try again when device storage is available.' : 'Waiting for saved devices and network profiles before making changes.'}
      </Text>
      <Button variant="outline" disabled={retrying} onPress={async () => {
        setRetrying(true);
        try { await reloadDeviceData(); } finally { setRetrying(false); setRetried(true); }
      }}><Text>{retrying ? 'Loading…' : 'Retry loading'}</Text></Button>
    </View>
  </SafeAreaView>;
}
