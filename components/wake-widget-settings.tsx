import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDevicesStore } from '@/store/devices';
import { useWakeWidgetStore } from '@/store/wake-widget';
import { getWakeWidgetUnavailableReason, requestPinWakeWidget } from '@/modules/wol-sender';
import { cn } from '@/lib/utils';

export function WakeWidgetSettings() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pinning, setPinning] = useState(false);
  const devices = useDevicesStore((state) => state.devices);
  const { selectedDeviceId, selectDevice, syncError } = useWakeWidgetStore();
  const unavailable = getWakeWidgetUnavailableReason();
  const selected = devices.find((device) => device.id === selectedDeviceId);

  async function addWidget() {
    setPinning(true);
    try {
      const requested = await requestPinWakeWidget();
      setMessage(requested
        ? 'Confirm with your launcher to add the widget.'
        : 'Long-press your home screen, choose Widgets, then add POWL Wake.');
    } catch {
      setMessage('The widget could not be added. Try the Widgets menu on your home screen.');
    } finally {
      setPinning(false);
    }
  }

  return (
    <>
      <Button variant="ghost" onPress={() => setOpen(true)}><Text className="text-sm text-muted-foreground">Home-screen widget</Text></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Home-screen widget</DialogTitle>
            <DialogDescription>Wake a computer with one tap. All POWL widgets use the device selected here.</DialogDescription>
          </DialogHeader>
          {unavailable ? <Text className="text-sm text-muted-foreground">{unavailable}</Text> : (
            <>
              <View>
                <View accessibilityRole="radiogroup" className="gap-2">
                  {[{ id: null, name: 'No device' }, ...devices].map((device) => (
                    <Pressable
                      key={device.id ?? 'none'}
                      accessibilityRole="radio"
                      accessibilityLabel={device.name}
                      accessibilityState={{ checked: device.id === (selected?.id ?? null) }}
                      onPress={() => { selectDevice(device.id); setMessage(null); }}
                      className={cn('min-h-12 justify-center rounded-md border border-border p-3', device.id === (selected?.id ?? null) && 'border-primary bg-primary/10')}
                    >
                      <Text>{device.name}{device.id === (selected?.id ?? null) ? ' ✓' : ''}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Text className="text-sm text-muted-foreground">The widget uses this device’s saved network destination. Connect to that network before waking; the widget does not detect your connection. Its last result is shown on the widget, separately from app history. A sent request does not confirm that the computer woke.</Text>
              <Button disabled={!selected || pinning || !!syncError} onPress={addWidget}><Text>{pinning ? 'Opening launcher…' : 'Add to home screen'}</Text></Button>
            </>
          )}
          {syncError ? <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">{syncError}</Text> : null}
          {message ? <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">{message}</Text> : null}
          <Button variant="outline" onPress={() => setOpen(false)}><Text>Done</Text></Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
