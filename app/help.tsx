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
      <Section title="4 · Check availability">
        <Text className="leading-6">In Add or Edit device, use Status checks → Find on network while your computer is awake. Select its file sharing, SSH, VNC, or HTTP service. Computers that do not advertise a service may not appear; use Enter IP manually instead.</Text>
        <Text className="leading-6">For manual checks, use the computer’s own IPv4 address and optionally an open TCP port. A router DHCP reservation keeps its address stable. POWL checks while open, including faster checks after a wake request.</Text>
        <Text className="leading-6">Online means the configured address or service responded. Not reachable can mean sleep, shutdown, a firewall, or a stopped service. It does not prove the computer is off. Unknown means a check is not currently possible.</Text>
      </Section>
      <Section title="If it stays asleep">
        <Text className="leading-6">
          Guest Wi-Fi, VPNs, and router isolation can block packets. Check your
          computer’s wake settings and network connection. Open Troubleshooting
          from the device for more help.
        </Text>
        <Text className="text-muted-foreground leading-6">
          A sent wake request does not confirm the computer woke. Optional status checks report network reachability separately.
          Your saved devices stay on this phone.
        </Text>
      </Section>
    </Screen>
  );
}
