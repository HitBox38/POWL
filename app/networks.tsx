import { View } from "react-native";
import { router } from "expo-router";
import { Screen, Section, SettingsRow } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useNetworkProfilesStore } from "@/store/network-profiles";

export default function NetworksScreen() {
  const profiles = useNetworkProfilesStore((state) => state.profiles);
  const active = useNetworkProfilesStore((state) => state.activeProfileId);
  const select = useNetworkProfilesStore((state) => state.setActiveProfile);
  return (
    <Screen
      title="Network profiles"
      subtitle="Choose the network you’re connected to. This selection is manual; POWL cannot detect or change Wi-Fi."
    >
      <Section title="Selected network">
        <View accessibilityRole="radiogroup" className="gap-2">
          {[{ id: null, name: "No network selected" }, ...profiles].map(
            (profile) => (
              <Button
                key={profile.id ?? "none"}
                variant={active === profile.id ? "secondary" : "outline"}
                accessibilityRole="radio"
                accessibilityState={{ checked: active === profile.id }}
                className="justify-start"
                onPress={() => select(profile.id)}
              >
                <Text
                  className={
                    active === profile.id ? "text-primary" : "text-foreground"
                  }
                >
                  {active === profile.id ? "✓  " : ""}
                  {profile.name}
                </Text>
              </Button>
            ),
          )}
        </View>
      </Section>
      <Section title="Saved profiles">
        {profiles.length ? (
          <View>
            {profiles.map((profile) => (
              <SettingsRow
                key={profile.id}
                title={profile.name}
                detail={profile.broadcastIp}
                onPress={() =>
                  router.push({
                    pathname: "/network/[id]",
                    params: { id: profile.id },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <Text className="text-muted-foreground leading-6">
            Create a Home or Office profile to share broadcast settings. Link
            devices from their Advanced settings.
          </Text>
        )}
        <Button onPress={() => router.push("/network/new")}>
          <Text>Add network profile</Text>
        </Button>
      </Section>
    </Screen>
  );
}
