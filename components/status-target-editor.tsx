import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { SERVICE_TYPES, serviceKey, serviceLabel, targetLabel, type StatusTargetDraft } from '@/lib/availability';
import { ServiceDiscovery, type DiscoverySnapshot } from '@/lib/service-discovery';
import { availabilityNative as native, availabilityUnavailableReason } from '@/modules/wol-sender/availability';
import { useAvailabilityStore } from '@/store/availability';

export function StatusTargetEditor({ draft, onChange, error }: {
  draft: StatusTargetDraft; onChange: (draft: StatusTargetDraft) => void; error?: string;
}) {
  const focused = useIsFocused();
  const network = useAvailabilityStore(state => state.network);
  const [{ services, searching, notice }, setDiscovery] = useState<DiscoverySnapshot>({ services: [], searching: false, notice: '' });
  const discovery = useRef<ServiceDiscovery | undefined>(undefined);
  const unavailable = availabilityUnavailableReason();

  function stop() {
    discovery.current?.stop();
  }
  useEffect(() => {
    const controller = new ServiceDiscovery(native, setDiscovery);
    discovery.current = controller;
    const subscription = native.onDiscovery(event => controller.receive(event));
    const app = AppState.addEventListener('change', state => {
      if (state !== 'active') controller.reset('Discovery paused. Tap Find on network to try again.');
    });
    return () => { controller.stop(); discovery.current = undefined; subscription?.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    discovery.current?.reset();
  }, [focused, network.key]);

  function find() { discovery.current?.start([...SERVICE_TYPES]); }

  return (
    <View className="gap-3 mb-6">
      <Text accessibilityRole="header" className="text-lg font-semibold">Status checks · optional</Text>
      <Text className="text-sm text-muted-foreground">Find your computer while it is awake, then select it once. Only computers advertising a supported service appear; names are not matched to MAC addresses.</Text>
      {draft.mode === 'service' && draft.service ? <Text>Selected: {targetLabel(draft.service)}</Text> : null}
      <Button variant="outline" disabled={!!unavailable || !network.available || searching} onPress={find}>
        <Text>{searching ? 'Searching…' : notice ? 'Retry discovery' : 'Find on network'}</Text>
      </Button>
      {unavailable || !network.available ? <Text className="text-sm text-muted-foreground">{unavailable ?? network.reason}</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">{notice}</Text> : null}
      {services.map(service => (
        <Button key={serviceKey(service)} variant="outline" className="h-auto min-h-12 py-3 items-start"
          accessibilityLabel={`Select ${service.name}, ${serviceLabel(service.serviceType)}, ${service.ip}, port ${service.port}`}
          accessibilityState={{ selected: draft.mode === 'service' && !!draft.service && serviceKey(draft.service) === serviceKey(service) }}
          onPress={() => { stop(); onChange({ ...draft, mode: 'service', service: { kind: 'service', name: service.name, serviceType: service.serviceType } }); }}>
          <Text>{service.name}</Text>
          <Text className="text-sm">{serviceLabel(service.serviceType)} · {service.ip}:{service.port}</Text>
        </Button>
      ))}
      <Button variant="ghost" onPress={() => { stop(); onChange({ ...draft, mode: 'manual' }); }}><Text>Enter IP manually</Text></Button>
      {draft.mode === 'manual' ? (
        <View className="gap-3">
          <Text>Computer IPv4 address</Text>
          <Input accessibilityLabel="Computer IPv4 address" value={draft.ip} onChangeText={ip => onChange({ ...draft, ip })}
            keyboardType="decimal-pad" autoCapitalize="none" autoCorrect={false} placeholder="192.168.1.10" />
          <Text>TCP port · optional</Text>
          <Input accessibilityLabel="Status check TCP port, optional" value={draft.port} onChangeText={port => onChange({ ...draft, port })}
            keyboardType="number-pad" placeholder="e.g. 22 for SSH" />
          <Text className="text-sm text-muted-foreground">Use your computer’s own IP, not the wake broadcast address. A stable IP or router DHCP reservation avoids stale addresses. Leave the port empty for a reachability check; firewalls may block it.</Text>
        </View>
      ) : null}
      {draft.mode !== 'none' ? <Button variant="ghost" onPress={() => { stop(); onChange({ mode: 'none', ip: '', port: '' }); }}><Text>Remove status checks</Text></Button> : null}
      {error ? <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">{error}</Text> : null}
    </View>
  );
}
