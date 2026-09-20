import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useThemePreference } from '@/components/app-theme-provider';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'system', label: 'System', description: 'Follow your device’s appearance.' },
  { value: 'light', label: 'Light', description: 'Bright surfaces with dark text.' },
  { value: 'dark', label: 'Dark', description: 'Dark surfaces with light text.' },
] as const;

export function AppearanceSettings() {
  const [open, setOpen] = useState(false);
  const { preference, setPreference, storageError } = useThemePreference();
  const label = OPTIONS.find((option) => option.value === preference)!.label;

  return (
    <>
      <Button variant="ghost" onPress={() => setOpen(true)} accessibilityLabel={`Appearance: ${label}. Change appearance`}>
        <Text className="text-sm text-muted-foreground">Appearance · {label}</Text>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appearance</DialogTitle>
            <DialogDescription>Choose how POWL looks.</DialogDescription>
          </DialogHeader>
          <View accessibilityRole="radiogroup" className="gap-2">
            {OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label}. ${option.description}`}
                accessibilityState={{ checked: preference === option.value }}
                onPress={() => setPreference(option.value)}
                className={cn('min-h-12 rounded-md border border-border p-3', preference === option.value && 'border-primary bg-primary/10')}
              >
                <Text className="font-semibold">{option.label}{preference === option.value ? ' ✓' : ''}</Text>
                <Text className="text-sm text-muted-foreground">{option.description}</Text>
              </Pressable>
            ))}
          </View>
          {storageError ? <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">{storageError}</Text> : null}
          <Button onPress={() => setOpen(false)}><Text>Done</Text></Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
