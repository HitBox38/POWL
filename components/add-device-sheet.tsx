import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useDevicesStore } from '@/store/devices';

type AddDeviceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAC_REGEX = /^([0-9A-Fa-f]{2}[:\-]){5}([0-9A-Fa-f]{2})$/;
const IP_REGEX =
  /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

type FieldErrors = {
  name?: string;
  macAddress?: string;
  broadcastIp?: string;
};

export function AddDeviceSheet({ open, onOpenChange }: AddDeviceSheetProps) {
  const { addDevice } = useDevicesStore();

  const [name, setName] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [broadcastIp, setBroadcastIp] = useState('255.255.255.255');
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Device name is required';
    }

    if (!macAddress.trim()) {
      newErrors.macAddress = 'MAC address is required';
    } else if (!MAC_REGEX.test(macAddress.trim())) {
      newErrors.macAddress = 'Format: AA:BB:CC:DD:EE:FF';
    }

    if (!broadcastIp.trim()) {
      newErrors.broadcastIp = 'Broadcast IP is required';
    } else if (!IP_REGEX.test(broadcastIp.trim())) {
      newErrors.broadcastIp = 'Enter a valid IP address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;

    addDevice({
      name: name.trim(),
      macAddress: macAddress.trim().toUpperCase(),
      broadcastIp: broadcastIp.trim(),
    });

    handleClose();
  };

  const handleClose = () => {
    setName('');
    setMacAddress('');
    setBroadcastIp('255.255.255.255');
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border mx-4 rounded-2xl">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-foreground text-xl font-bold">
                Add Device
              </DialogTitle>
            </DialogHeader>

            {/* Name field */}
            <View className="mb-4">
              <Label className="text-foreground mb-1.5" nativeID="name-label">
                Device Name
              </Label>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="e.g. Gaming PC"
                placeholderTextColor="hsl(215, 20%, 45%)"
                className="bg-secondary border-border text-foreground"
                accessibilityLabelledBy="name-label"
              />
              {errors.name ? (
                <Text className="text-destructive text-xs mt-1">{errors.name}</Text>
              ) : null}
            </View>

            {/* MAC Address field */}
            <View className="mb-4">
              <Label className="text-foreground mb-1.5" nativeID="mac-label">
                MAC Address
              </Label>
              <Input
                value={macAddress}
                onChangeText={setMacAddress}
                placeholder="AA:BB:CC:DD:EE:FF"
                placeholderTextColor="hsl(215, 20%, 45%)"
                autoCapitalize="characters"
                autoCorrect={false}
                className="bg-secondary border-border text-foreground font-mono"
                accessibilityLabelledBy="mac-label"
              />
              {errors.macAddress ? (
                <Text className="text-destructive text-xs mt-1">{errors.macAddress}</Text>
              ) : null}
            </View>

            {/* Broadcast IP field */}
            <View className="mb-6">
              <Label className="text-foreground mb-1.5" nativeID="ip-label">
                Broadcast IP
              </Label>
              <Input
                value={broadcastIp}
                onChangeText={setBroadcastIp}
                placeholder="255.255.255.255"
                placeholderTextColor="hsl(215, 20%, 45%)"
                keyboardType="decimal-pad"
                autoCorrect={false}
                className="bg-secondary border-border text-foreground font-mono"
                accessibilityLabelledBy="ip-label"
              />
              {errors.broadcastIp ? (
                <Text className="text-destructive text-xs mt-1">{errors.broadcastIp}</Text>
              ) : null}
              <Text className="text-muted-foreground text-xs mt-1">
                Use 192.168.x.255 for subnet broadcast
              </Text>
            </View>

            <DialogFooter className="flex-row gap-3">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  onPress={handleClose}
                >
                  <Text className="text-foreground">Cancel</Text>
                </Button>
              </DialogClose>
              <Button className="flex-1 bg-primary" onPress={handleAdd}>
                <Text className="text-primary-foreground font-semibold">Add Device</Text>
              </Button>
            </DialogFooter>
          </ScrollView>
        </KeyboardAvoidingView>
      </DialogContent>
    </Dialog>
  );
}
