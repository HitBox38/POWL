import { Screen, Section } from "@/components/screen";
import { Text } from "@/components/ui/text";

export default function SetupHelpScreen() {
  return (
    <Screen
      title="Setup guide"
      subtitle="A few things to check before your first wake."
    >
      <Section title="1 · Enable Wake-on-LAN">
        <Text className="leading-6">
          Enable Wake-on-LAN in your computer’s firmware and network adapter
          settings. Keep it connected to power. Ethernet is a good starting
          point; Wi-Fi and waking from shutdown depend on the hardware.
        </Text>
      </Section>
      <Section title="2 · Find its MAC address">
        <Text className="leading-6">
          Use the address of your computer’s connected network adapter, not your
          phone or router. Ethernet and Wi-Fi have different addresses.
        </Text>
        <Text className="leading-6">
          On Windows, open Settings → Network & internet → your connection’s
          properties → Physical address (MAC).
        </Text>
        <Text className="leading-6">
          On other systems, look in the adapter’s network or hardware settings.
          You can paste an address with colons, hyphens, dots, or no separators.
        </Text>
      </Section>
      <Section title="3 · Save and test">
        <Text className="leading-6">
          Connect your phone to the same local network. Save your device in
          POWL, put the computer to sleep, then tap Test wake. Check the
          computer directly to see whether it wakes.
        </Text>
      </Section>
      <Section title="If it stays asleep">
        <Text className="leading-6">
          Guest Wi-Fi, VPNs, and router isolation can block packets. Check your
          computer’s wake settings and network connection. Open Troubleshooting
          from the device for more help.
        </Text>
        <Text className="text-muted-foreground leading-6">
          POWL sends a request; it cannot detect whether your computer is awake.
          Your saved devices stay on this phone.
        </Text>
      </Section>
    </Screen>
  );
}
