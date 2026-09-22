import { useState } from 'react';
import { View } from 'react-native';
import { Section } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type ComputerOS = 'Windows' | 'Linux' | 'Other';
const instructions: Record<ComputerOS, { adapter: string; wake: string }> = {
  Windows: {
    adapter: 'Open Settings → Network & internet → your connected adapter’s properties. Copy Physical address (MAC). Use the Ethernet adapter’s address if the cable is connected; Wi-Fi has a different address.',
    wake: 'In Device Manager → Network adapters → your adapter → Properties, look for Wake on Magic Packet under Advanced. Where Power Management is available, allow the adapter to wake the computer and select magic packets only. Options depend on the driver and hardware.',
  },
  Linux: {
    adapter: 'Open your wired connection’s details, or run ip link on the computer. Use the link/ether address of the connected adapter. Avoid virtual, container, and VPN interfaces.',
    wake: 'If ethtool is installed, run sudo ethtool INTERFACE (replace INTERFACE with the connected adapter). “Supports Wake-on” must include g. “Wake-on: g” means magic-packet wake is enabled. With NetworkManager, set the wired profile’s Wake-on-LAN option to magic; persistence depends on the network manager in use.',
  },
  Other: {
    adapter: 'Find the connected adapter’s MAC or hardware address in network settings. For a NAS or appliance, check its administration page or manufacturer’s instructions.',
    wake: 'Check the manufacturer’s instructions for Wake-on-LAN or wake for network access. Support depends on the adapter, operating system, and power state.',
  },
};

export function SetupWalkthrough({ onComplete, completeLabel = 'Continue to test' }: { onComplete: () => void; completeLabel?: string }) {
  const [os, setOS] = useState<ComputerOS>('Windows');
  const [step, setStep] = useState(0);
  const titles = ['Choose your computer', 'Find the right adapter', 'Enable wake support', 'Prepare a reliable test'];
  return <Section title={`Step ${step + 1} of 4 · ${titles[step]}`}>
    {step === 0 ? <>
      <Text className="text-muted-foreground">These instructions are for the computer you want to wake.</Text>
      <View className="gap-2" accessibilityRole="radiogroup">
        {(['Windows', 'Linux', 'Other'] as const).map(value => <Button key={value} variant={os === value ? 'default' : 'outline'}
          accessibilityRole="radio" accessibilityState={{ checked: os === value }} onPress={() => setOS(value)}><Text>{value}</Text></Button>)}
      </View>
    </> : null}
    {step === 1 ? <Text selectable className="leading-6">{instructions[os].adapter}</Text> : null}
    {step === 2 ? <>
      <Text selectable className="leading-6">{instructions[os].wake}</Text>
      <Text className="leading-6">Also check the computer’s BIOS/UEFI for Wake-on-LAN or PCIe wake. Keep it connected to power. POWL cannot read or change these settings.</Text>
    </> : null}
    {step === 3 ? <>
      <Text className="leading-6">Start with Ethernet and sleep mode. Waking over Wi-Fi or from shutdown varies by hardware and power settings.</Text>
      <Text className="leading-6">Connect your phone to the same local network. Avoid guest Wi-Fi, VPNs, and router client isolation. The broadcast address depends on the subnet mask; it does not always end in .255.</Text>
      <Text className="leading-6">While the computer is awake, configure a status check and make sure its address or service responds. Then put it to sleep and test. If you cannot configure a check, watch the computer directly.</Text>
    </> : null}
    <View className="flex-row gap-3">
      <Button className="flex-1" variant="outline" disabled={step === 0} onPress={() => setStep(value => value - 1)}><Text>Previous</Text></Button>
      <Button className="flex-1" onPress={() => step === 3 ? onComplete() : setStep(value => value + 1)}><Text>{step === 3 ? completeLabel : 'Next'}</Text></Button>
    </View>
  </Section>;
}
