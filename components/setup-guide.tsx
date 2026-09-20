import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function SetupGuide() {
  const [expanded, setExpanded] = useState(false);
  return (
    <View className="mb-4 rounded-xl border border-border bg-secondary p-3">
      <Text className="text-sm font-semibold text-foreground">Before your first wake</Text>
      <Text className="text-sm text-muted-foreground mt-1">1. Enable Wake-on-LAN on your computer.</Text>
      <Text className="text-sm text-muted-foreground mt-1">2. Connect your phone to the same local network.</Text>
      <Text className="text-sm text-muted-foreground mt-1">3. Save this device, put it to sleep, then tap Wake.</Text>
      <Button variant="ghost" className="mt-2 items-start" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)}>
        <Text className="text-primary">{expanded ? 'Hide setup help' : 'Find your MAC address & setup help'}</Text>
      </Button>
      {expanded ? (
        <View className="gap-3 mt-2">
          <Text className="text-sm text-muted-foreground">Use the MAC address of the computer’s connected network adapter, not your phone or router. Ethernet and Wi-Fi have different addresses.</Text>
          <Text className="text-sm text-muted-foreground">Windows: open Settings → Network &amp; internet, select your connection’s properties, and look for Physical address (MAC).</Text>
          <Text className="text-sm text-muted-foreground">Other systems: look in the connected adapter’s network or hardware settings for MAC address or hardware address. Paste it with colons, hyphens, dots, or no separators.</Text>
          <Text className="text-sm text-muted-foreground">Wake support depends on your hardware. Check the computer’s firmware and network adapter power settings for Wake-on-LAN. On supported Macs, look for Wake for network access. Ethernet is a good starting point.</Text>
          <Text className="text-sm text-muted-foreground">Keep the computer connected to power. Try sleep first; waking from shutdown or over Wi-Fi depends on the computer.</Text>
          <Text className="text-sm text-muted-foreground">POWL sends a wake request; a sent packet does not confirm the computer woke. Test while you can see the computer.</Text>
        </View>
      ) : null}
    </View>
  );
}
