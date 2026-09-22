import { useState } from 'react';
import { router } from 'expo-router';
import { Screen, Section } from '@/components/screen';
import { SetupWalkthrough } from '@/components/setup-walkthrough';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function SetupHelpScreen() {
  const [complete, setComplete] = useState(false);
  return <Screen title="Setup guide" subtitle="Set up your computer, then test a wake on your local network.">
    {!complete ? <SetupWalkthrough onComplete={() => setComplete(true)} completeLabel="Finish guide" /> : <Section title="Ready to save and test">
      <Text className="leading-6">Add your computer using its connected adapter’s MAC address. On its device page, open Troubleshooting for a guided wake test and next steps based on the result.</Text>
      <Button onPress={() => router.push('/device/new')}><Text>Add device</Text></Button>
      <Button variant="outline" onPress={() => router.dismissTo('/')}><Text>Choose a saved device</Text></Button>
      <Button variant="ghost" onPress={() => setComplete(false)}><Text>Review guide</Text></Button>
    </Section>}
    <Section title="About status checks">
      <Text className="leading-6">In Add or Edit device, choose Status checks → Find on network while your computer is awake. Select its advertised service, or enter its own IPv4 address and optionally an open TCP port. Use a DHCP reservation to keep manual addresses stable.</Text>
      <Text className="text-muted-foreground leading-6">Online means the selected endpoint responded. Not reachable may mean sleep, shutdown, a stopped service, or a firewall. Unknown means a check is not possible. Sending a wake packet never proves that the computer woke.</Text>
    </Section>
  </Screen>;
}
