import { useRef, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, TextInput } from 'react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { SetupGuide } from '@/components/setup-guide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useDevicesStore, type Device } from '@/store/devices';
import { normalizeDeviceFields, normalizeMac, validateDeviceFields, type DeviceFields } from '@/lib/device-form';

type AddDeviceSheetProps = { open: boolean; onOpenChange: (open: boolean) => void };
type DeviceEditorSheetProps = AddDeviceSheetProps & { device?: Device };
const EMPTY_FIELDS: DeviceFields = { name: '', macAddress: '', broadcastIp: '255.255.255.255' };

// Unmount the draft when closed so Cancel, X, Escape and Android Back all discard it.
export function AddDeviceSheet(props: AddDeviceSheetProps) {
  return <DeviceEditorSheet {...props} />;
}

export function DeviceEditorSheet(props: DeviceEditorSheetProps) {
  return props.open ? <DeviceForm key={props.device?.id ?? 'new'} {...props} /> : null;
}

function DeviceForm({ open, onOpenChange, device }: DeviceEditorSheetProps) {
  const devices = useDevicesStore((state) => state.devices);
  const [fields, setFields] = useState<DeviceFields>(() => device ? { name: device.name, macAddress: device.macAddress, broadcastIp: device.broadcastIp } : EMPTY_FIELDS);
  const [submitted, setSubmitted] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { height } = useWindowDimensions();
  const macInput = useRef<TextInput>(null);
  const ipInput = useRef<TextInput>(null);
  const errors = submitted ? validateDeviceFields(fields, devices, device?.id) : {};
  const change = (field: keyof DeviceFields, value: string) => setFields((previous) => ({ ...previous, [field]: value }));
  const handleAdd = () => {
    setSubmitted(true);
    const validation = validateDeviceFields(fields, useDevicesStore.getState().devices, device?.id);
    if (Object.keys(validation).length) {
      if (validation.broadcastIp) setAdvancedOpen(true);
      return;
    }
    const store = useDevicesStore.getState();
    if (device) {
      const current = store.devices.find((item) => item.id === device.id);
      if (!current || current.wakeStatus === 'sending') return;
      store.updateDevice(device.id, normalizeDeviceFields(fields));
    } else {
      store.addDevice(normalizeDeviceFields(fields));
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border mx-4 rounded-2xl">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={{ maxHeight: height * 0.7 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
            <DialogHeader className="mb-4 pr-6">
              <DialogTitle className="text-foreground text-xl font-bold">{device ? 'Edit Device' : 'Add Device'}</DialogTitle>
              <DialogDescription>Wake a computer on your local network. Internet wake requires additional network configuration.</DialogDescription>
            </DialogHeader>
            {!device ? <SetupGuide /> : null}
            <View className="mb-4">
              <Label className="text-foreground mb-1.5" nativeID="name-label">Device Name</Label>
              <Input value={fields.name} onChangeText={(value) => change('name', value)} placeholder="e.g. Gaming PC"
                className="bg-secondary border-border text-foreground" accessibilityLabel="Device name" accessibilityLabelledBy="name-label"
                autoCapitalize="words" autoCorrect={false} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => macInput.current?.focus()} aria-invalid={!!errors.name} />
              {errors.name ? <Text accessibilityLiveRegion="polite" className="text-destructive text-sm mt-1">{errors.name}</Text> : null}
            </View>
            <View className="mb-4">
              <Label className="text-foreground mb-1.5" nativeID="mac-label">MAC Address</Label>
              <Input ref={macInput} value={fields.macAddress} onChangeText={(value) => change('macAddress', value)} onBlur={() => change('macAddress', normalizeMac(fields.macAddress))}
                placeholder="AA:BB:CC:DD:EE:FF" autoCapitalize="characters" autoCorrect={false} spellCheck={false} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => advancedOpen ? ipInput.current?.focus() : handleAdd()}
                className="bg-secondary border-border text-foreground font-mono" accessibilityLabel="MAC address" accessibilityLabelledBy="mac-label" aria-invalid={!!errors.macAddress} />
              {errors.macAddress ? <Text accessibilityLiveRegion="polite" className="text-destructive text-sm mt-1">{errors.macAddress}</Text> : null}
            </View>
            <Button variant="ghost" className="mb-2 items-start" accessibilityState={{ expanded: advancedOpen }} onPress={() => setAdvancedOpen(!advancedOpen)}>
              <Text className="text-primary">{advancedOpen ? 'Hide Advanced' : 'Advanced · broadcast settings'}</Text>
            </Button>
            {advancedOpen ? <View className="mb-6">
              <Label className="text-foreground mb-1.5" nativeID="ip-label">Broadcast IP</Label>
              <Input ref={ipInput} value={fields.broadcastIp} onChangeText={(value) => change('broadcastIp', value)} placeholder="255.255.255.255"
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} autoCapitalize="none" autoCorrect={false} spellCheck={false}
                returnKeyType="done" onSubmitEditing={handleAdd} className="bg-secondary border-border text-foreground font-mono"
                accessibilityLabel="Broadcast IP address" accessibilityLabelledBy="ip-label" aria-invalid={!!errors.broadcastIp} />
              {errors.broadcastIp ? <Text accessibilityLiveRegion="polite" className="text-destructive text-sm mt-1">{errors.broadcastIp}</Text> : null}
              <Text className="text-sm text-muted-foreground mt-2">The default sends to your local network. If it does not work, ask your network administrator for the subnet broadcast address. It depends on the subnet mask and does not always end in .255. Guest Wi-Fi or network isolation may block wake packets.</Text>
            </View> : <Text className="text-sm text-muted-foreground mb-4">Using local broadcast: {fields.broadcastIp}</Text>}
            <DialogFooter className="flex-row gap-3">
              <Button variant="outline" className="flex-1 border-border" onPress={() => onOpenChange(false)}><Text className="text-foreground">Cancel</Text></Button>
              <Button className="flex-1 bg-primary" onPress={handleAdd}><Text className="text-primary-foreground font-semibold">{device ? 'Save Changes' : 'Add Device'}</Text></Button>
            </DialogFooter>
          </ScrollView>
        </KeyboardAvoidingView>
      </DialogContent>
    </Dialog>
  );
}


